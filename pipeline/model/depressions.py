"""Stage 2 of the depth model: find the bowls (depressions) and their spill points.

One sweep visits every cell from lowest to highest ground (union-find over cells):

- A cell with no lower neighbour already visited is a pit: it starts a new bowl (a leaf).
- A cell that joins two separate bowls is a saddle, the spill point between them.
  The two bowls become children of a new, bigger bowl whose floor is that saddle.
  Each child records its spill height, its capacity at that height, and which bowl
  its overflow runs into.
- A cell on the edge of the map is an outlet. A bowl that meets an outlet is a
  top-level bowl: its overflow leaves the map.

Every cell also gets a catchment: the bowl its rain runs into, by following the
lowest visited neighbour (steepest descent).

Then a noise filter keeps only bowls deeper than `min_depth_m` with at least
`min_cells` cells. Shallow sub-bowls are absorbed into the bowl above them.

Algorithm: a merge-tree construction equivalent to the depression hierarchy of
Barnes, Callaghan and Wickert (2020, 2021). Source: prep/04-depth-model-and-routing.md 1.3.
"""

from __future__ import annotations

from dataclasses import dataclass

import numba
import numpy as np
from numpy.typing import NDArray

OUTLET = -1


@dataclass
class BowlTree:
    """The filtered bowl tree. Node ids are 0..n-1; bowl ids in the gold files are node + 1."""

    parent: NDArray[np.int32]  # -1 for top-level bowls
    child0: NDArray[np.int32]  # -1 for leaves
    child1: NDArray[np.int32]
    spill_m: NDArray[np.float64]  # water height at which the bowl overflows
    cap_m3: NDArray[np.float64]  # volume held when full to the spill height
    overflow: NDArray[np.int32]  # node that receives overflow, or OUTLET
    min_m: NDArray[np.float64]  # lowest ground in the bowl
    min_cell: NDArray[np.int64]  # flat index of the lowest cell
    cell_node: NDArray[np.int32]  # per cell: lowest bowl containing it, -1 = drains away
    cell_catchment: NDArray[np.int32]  # per cell: leaf bowl its rain runs into, -1 = leaves the map
    cell_area_m2: float

    @property
    def n(self) -> int:
        return int(self.parent.shape[0])


@numba.njit(cache=True)
def _find(uf: NDArray[np.int64], x: int) -> int:
    while uf[x] != x:
        uf[x] = uf[uf[x]]
        x = uf[x]
    return x


@numba.njit(cache=True)
def _sweep(z: NDArray[np.float64], height: int, width: int, order: NDArray[np.int64]):  # type: ignore[no-untyped-def]
    n_cells = height * width
    uf = np.arange(n_cells, dtype=np.int64)
    visited = np.zeros(n_cells, dtype=np.bool_)
    comp_node = np.full(n_cells, -1, dtype=np.int64)
    comp_count = np.zeros(n_cells, dtype=np.int64)
    comp_sum = np.zeros(n_cells, dtype=np.float64)
    comp_ocean = np.zeros(n_cells, dtype=np.bool_)

    cell_node = np.full(n_cells, -1, dtype=np.int64)
    catch = np.full(n_cells, -1, dtype=np.int64)

    node_parent = np.full(n_cells, -1, dtype=np.int64)
    node_c0 = np.full(n_cells, -1, dtype=np.int64)
    node_c1 = np.full(n_cells, -1, dtype=np.int64)
    node_spill = np.full(n_cells, np.nan, dtype=np.float64)
    node_cap = np.zeros(n_cells, dtype=np.float64)  # in cell-heights (multiply by cell area)
    node_over = np.full(n_cells, -2, dtype=np.int64)  # -2 unset, -1 outlet
    node_min = np.zeros(n_cells, dtype=np.float64)
    node_mincell = np.zeros(n_cells, dtype=np.int64)
    node_count = np.zeros(n_cells, dtype=np.int64)
    n_nodes = 0

    nbr = np.empty(8, dtype=np.int64)
    for k in range(n_cells):
        c = order[k]
        zc = z[c]
        r = c // width
        col = c - r * width
        on_edge = r == 0 or r == height - 1 or col == 0 or col == width - 1

        # visited neighbours, 8-connected
        m = 0
        lowest = -1
        for dr in (-1, 0, 1):
            for dc in (-1, 0, 1):
                if dr == 0 and dc == 0:
                    continue
                rr = r + dr
                cc = col + dc
                if rr < 0 or rr >= height or cc < 0 or cc >= width:
                    continue
                q = rr * width + cc
                if visited[q]:
                    nbr[m] = q
                    m += 1
                    if lowest == -1 or z[q] < z[lowest] or (z[q] == z[lowest] and q < lowest):
                        lowest = q
        visited[c] = True

        if on_edge:
            comp_ocean[c] = True
            comp_count[c] = 1
            comp_sum[c] = zc
            catch[c] = -1
            for i in range(m):
                y = _find(uf, nbr[i])
                x = _find(uf, c)
                if x == y:
                    continue
                if not comp_ocean[y]:
                    d = comp_node[y]
                    node_spill[d] = zc
                    node_cap[d] = comp_count[y] * zc - comp_sum[y]
                    node_over[d] = -1
                uf[y] = x
                comp_count[x] += comp_count[y]
                comp_sum[x] += comp_sum[y]
            continue

        if m == 0:
            node = n_nodes
            n_nodes += 1
            node_min[node] = zc
            node_mincell[node] = c
            comp_node[c] = node
            comp_count[c] = 1
            comp_sum[c] = zc
            cell_node[c] = node
            catch[c] = node
            continue

        catch[c] = catch[lowest]
        x = _find(uf, lowest)
        uf[c] = x
        comp_count[x] += 1
        comp_sum[x] += zc

        for i in range(m):
            y = _find(uf, nbr[i])
            x = _find(uf, c)
            if x == y:
                continue
            if comp_ocean[x] or comp_ocean[y]:
                if not comp_ocean[x]:
                    d = comp_node[x]
                    node_spill[d] = zc
                    node_cap[d] = comp_count[x] * zc - comp_sum[x]
                    node_over[d] = -1
                    # the merged component is ocean: keep y as root
                    uf[x] = y
                    comp_count[y] += comp_count[x]
                    comp_sum[y] += comp_sum[x]
                else:
                    if not comp_ocean[y]:
                        d = comp_node[y]
                        node_spill[d] = zc
                        node_cap[d] = comp_count[y] * zc - comp_sum[y]
                        node_over[d] = -1
                    uf[y] = x
                    comp_count[x] += comp_count[y]
                    comp_sum[x] += comp_sum[y]
                continue

            nx = comp_node[x]
            ny = comp_node[y]
            # lowest visited neighbour of c inside each side gives the overflow target
            low_x = -1
            low_y = -1
            for j in range(m):
                q = nbr[j]
                rq = _find(uf, q)
                if rq == x and q != c:
                    if low_x == -1 or z[q] < z[low_x]:
                        low_x = q
                elif rq == y:
                    if low_y == -1 or z[q] < z[low_y]:
                        low_y = q
            parent = n_nodes
            n_nodes += 1
            for child, comp, target in ((nx, x, low_y), (ny, y, low_x)):
                node_parent[child] = parent
                node_spill[child] = zc
                node_cap[child] = comp_count[comp] * zc - comp_sum[comp]
                node_over[child] = catch[target] if target >= 0 else -1
            node_c0[parent] = nx
            node_c1[parent] = ny
            if node_min[nx] <= node_min[ny]:
                node_min[parent] = node_min[nx]
                node_mincell[parent] = node_mincell[nx]
            else:
                node_min[parent] = node_min[ny]
                node_mincell[parent] = node_mincell[ny]
            uf[y] = x
            comp_count[x] += comp_count[y]
            comp_sum[x] += comp_sum[y]
            comp_node[x] = parent

        root = _find(uf, c)
        cell_node[c] = -1 if comp_ocean[root] else comp_node[root]

    for i in range(n_nodes):
        node_count[i] = 0
    for c in range(n_cells):
        if cell_node[c] >= 0:
            node_count[cell_node[c]] += 1

    return (
        n_nodes,
        node_parent[:n_nodes].copy(),
        node_c0[:n_nodes].copy(),
        node_c1[:n_nodes].copy(),
        node_spill[:n_nodes].copy(),
        node_cap[:n_nodes].copy(),
        node_over[:n_nodes].copy(),
        node_min[:n_nodes].copy(),
        node_mincell[:n_nodes].copy(),
        cell_node,
        catch,
    )


def find_bowls(
    ground_m: NDArray[np.floating],
    cell_size_m: float,
    min_depth_m: float = 0.10,
    min_cells: int = 3,
) -> BowlTree:
    """Build the filtered bowl tree for a ground grid (row-major, any orientation)."""
    height, width = ground_m.shape
    z = np.ascontiguousarray(ground_m, dtype=np.float64).ravel()
    order = np.argsort(z, kind="stable").astype(np.int64)
    (n, parent, c0, c1, spill, cap, over, zmin, mincell, cell_node, catch) = _sweep(z, height, width, order)

    # Subtree size in cells (children always have lower ids than their parent).
    own = np.bincount(cell_node[cell_node >= 0], minlength=n).astype(np.int64)
    size = own.copy()
    for i in range(n):
        if parent[i] >= 0:
            size[parent[i]] += size[i]
    depth = spill - zmin
    significant = (depth >= min_depth_m) & (size >= min_cells) & np.isfinite(spill)

    # Top-down: a significant node under a final internal node (or at the top) is final.
    # A final node is internal only if both children are significant; otherwise it
    # absorbs everything below it. rep[i] = the final node that stands for i, or -1.
    rep = np.full(n, -1, dtype=np.int64)
    internal = np.zeros(n, dtype=bool)
    for i in range(n - 1, -1, -1):
        p = parent[i]
        if p < 0:
            rep[i] = i if significant[i] else -1
        elif internal[p] and significant[i]:
            rep[i] = i
        else:
            rep[i] = rep[p]
        if rep[i] == i and c0[i] >= 0 and significant[c0[i]] and significant[c1[i]]:
            internal[i] = True

    final = np.flatnonzero(rep == np.arange(n))
    new_id = np.full(n, -1, dtype=np.int64)
    new_id[final] = np.arange(final.size)

    def remap(old: NDArray[np.int64]) -> NDArray[np.int32]:
        out = np.full(old.shape, -1, dtype=np.int32)
        ok = old >= 0
        r = rep[old[ok]]
        out[ok] = np.where(r >= 0, new_id[np.maximum(r, 0)], -1)
        return out

    f_parent = np.array([new_id[parent[i]] if parent[i] >= 0 and internal[parent[i]] else -1 for i in final], dtype=np.int32)
    f_c0 = np.array([new_id[c0[i]] if internal[i] else -1 for i in final], dtype=np.int32)
    f_c1 = np.array([new_id[c1[i]] if internal[i] else -1 for i in final], dtype=np.int32)
    f_over = np.array(
        [OUTLET if (over[i] < 0 or f_parent[k] < 0) else int(remap(np.array([over[i]]))[0]) for k, i in enumerate(final)],
        dtype=np.int32,
    )
    area = float(cell_size_m) ** 2
    return BowlTree(
        parent=f_parent,
        child0=f_c0,
        child1=f_c1,
        spill_m=spill[final].astype(np.float64),
        cap_m3=cap[final] * area,
        overflow=f_over,
        min_m=zmin[final].astype(np.float64),
        min_cell=mincell[final].astype(np.int64),
        cell_node=remap(cell_node),
        cell_catchment=remap(catch),
        cell_area_m2=area,
    )
