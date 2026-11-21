"""Build and render Fludd's boot animation in Blender (headless).

Usage:
  blender --background --python build_boot.py -- <desktop|phone> <stills|anim> <output_dir>

The scene is rebuilt from design/boot/reference/*.svg on every run, so the result is
reproducible. Timing follows the 2D design: 4.9 s at 30 fps.
"""
from __future__ import annotations

import math
import os
import random
import sys

import bpy
from mathutils import Vector

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
VARIANT = ARGS[0] if ARGS else "desktop"
MODE = ARGS[1] if len(ARGS) > 1 else "stills"
OUT = ARGS[2] if len(ARGS) > 2 else os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")
HERE = os.path.dirname(os.path.abspath(__file__))
REF = os.path.join(HERE, "reference")

FPS = 30
LAST = 148  # 4.9 s

# Design pixel coordinates, taken from the 2D boards. ppm = design pixels per metre (logo is 2 m wide).
LAYOUT = {
    "desktop": dict(w=1440, h=900, ppm=160.0, logo=(720, 320), drop=(720, 148), fall=282, ring=(720, 458),
                    handoff=(160, 18), res=(1440, 900), streaks=56, rain_w=1800),
    "phone": dict(w=390, h=844, ppm=120.0, logo=(195, 260), drop=(195, 124), fall=211, ring=(195, 363),
                  handoff=(75, 456), res=(780, 1688), streaks=44, rain_w=760),
}[VARIANT]
PPM = LAYOUT["ppm"]

BG, WATER, DEEP, HILITE, FOAM = "#f2f1ec", "#5b8fd6", "#23467f", "#9cc7ea", "#fbfaf6"
BODY, STRIPE, BEAK, INK = "#5a4e44", "#e4d8bf", "#e8964a", "#1c1d21"


def frame_at(seconds: float) -> int:
    return round(seconds * FPS) + 1


def world(px_x: float, px_y: float) -> tuple[float, float]:
    """Design pixels to world metres, with the logo centre at the origin."""
    return ((px_x - LAYOUT["logo"][0]) / PPM, (LAYOUT["logo"][1] - px_y) / PPM)


def lin(hex_colour: str) -> list[float]:
    h = hex_colour.lstrip("#")
    srgb = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return [v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in srgb] + [1.0]


def material(name: str, hex_colour: str, rough: float = 0.62, blended: bool = False) -> bpy.types.Material:
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = lin(hex_colour)
    bsdf.inputs["Roughness"].default_value = rough
    if "Specular IOR Level" in bsdf.inputs:
        bsdf.inputs["Specular IOR Level"].default_value = 0.35
    if blended:
        try:
            m.surface_render_method = "BLENDED"
        except Exception:
            m.blend_method = "BLEND"
    return m


INTERP: list[tuple[bpy.types.ID, str, int, str, str]] = []


def key(target, path: str, frame: int, interp: str = "BEZIER", easing: str = "AUTO") -> None:
    target.keyframe_insert(data_path=path, frame=frame)
    INTERP.append((target, path, frame, interp, easing))


def fcurves_of(idb) -> list:
    ad = getattr(idb, "animation_data", None)
    if not ad or not ad.action:
        return []
    try:
        from bpy_extras import anim_utils
        bag = anim_utils.action_get_channelbag_for_slot(ad.action, ad.action_slot)
        return list(bag.fcurves) if bag else []
    except Exception:
        return list(getattr(ad.action, "fcurves", []))


def apply_interpolation() -> None:
    for target, path, frame, interp, easing in INTERP:
        for fc in fcurves_of(target):
            if fc.data_path != path:
                continue
            for kp in fc.keyframe_points:
                if abs(kp.co.x - frame) < 0.01:
                    kp.interpolation = interp
                    kp.easing = easing


def empty(name: str, loc=(0.0, 0.0, 0.0)) -> bpy.types.Object:
    e = bpy.data.objects.new(name, None)
    e.location = loc
    bpy.context.scene.collection.objects.link(e)
    return e


def adopt(child: bpy.types.Object, parent: bpy.types.Object) -> None:
    bpy.context.view_layer.update()
    child.parent = parent
    child.matrix_parent_inverse = parent.matrix_world.inverted()


def import_svg(path: str) -> list[bpy.types.Object]:
    before = set(bpy.data.objects)
    try:
        bpy.ops.import_curve.svg(filepath=path)
    except Exception:
        bpy.ops.preferences.addon_enable(module="io_curve_svg")
        bpy.ops.import_curve.svg(filepath=path)
    new = sorted(set(bpy.data.objects) - before, key=lambda o: o.name)
    for o in new:  # the importer puts them in their own collection; move to the scene root
        for c in list(o.users_collection):
            c.objects.unlink(o)
        bpy.context.scene.collection.objects.link(o)
    return new


def bounds(objs) -> tuple[Vector, Vector]:
    bpy.context.view_layer.update()
    pts = [o.matrix_world @ Vector(c) for o in objs for c in o.bound_box]
    return (Vector((min(p.x for p in pts), min(p.y for p in pts), 0)), Vector((max(p.x for p in pts), max(p.y for p in pts), 0)))


def solid(obj, mat, depth: float, bevel: float, z: float) -> None:
    c = obj.data
    c.dimensions = "2D"
    c.fill_mode = "BOTH"
    c.extrude = depth
    c.bevel_depth = bevel
    c.bevel_resolution = 4
    c.resolution_u = 24
    c.materials.clear()
    c.materials.append(mat)
    obj.location.z = z


def tube(obj, mat, radius: float, z: float) -> None:
    c = obj.data
    c.dimensions = "3D"
    c.fill_mode = "FULL"
    c.extrude = 0
    c.bevel_depth = radius
    c.bevel_resolution = 6
    c.resolution_u = 24
    c.use_fill_caps = True
    c.materials.clear()
    c.materials.append(mat)
    obj.location.z = z


def sphere(name: str, loc, radius: float, mat) -> bpy.types.Object:
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=radius, location=loc)
    o = bpy.context.active_object
    o.name = name
    bpy.ops.object.shade_smooth()
    o.data.materials.append(mat)
    return o


# ------------------------------------------------------------------ scene
for o in list(bpy.data.objects):
    bpy.data.objects.remove(o, do_unlink=True)
scene = bpy.context.scene
scene.render.fps = FPS
scene.frame_start, scene.frame_end = 1, LAST
try:
    scene.render.engine = "BLENDER_EEVEE"
except Exception:
    scene.render.engine = "BLENDER_EEVEE_NEXT"
scene.eevee.taa_render_samples = 24
scene.view_settings.view_transform = "Standard"
scene.view_settings.look = "None"
scene.view_settings.exposure = 0
scene.view_settings.gamma = 1
scene.render.dither_intensity = 0
scene.render.film_transparent = False
scene.render.resolution_x, scene.render.resolution_y = LAYOUT["res"]
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGB"

# World: the camera sees the exact page colour; objects get a dimmer neutral fill so colours stay true.
world_data = bpy.data.worlds.new("FluddWorld")
scene.world = world_data
world_data.use_nodes = True
nt = world_data.node_tree
nt.nodes.clear()
out_node = nt.nodes.new("ShaderNodeOutputWorld")
mix = nt.nodes.new("ShaderNodeMixShader")
lp = nt.nodes.new("ShaderNodeLightPath")
fill = nt.nodes.new("ShaderNodeBackground")
fill.inputs["Color"].default_value = (1, 1, 1, 1)
fill.inputs["Strength"].default_value = 0.36
page = nt.nodes.new("ShaderNodeBackground")
page.inputs["Color"].default_value = lin(BG)
page.inputs["Strength"].default_value = 1.0
nt.links.new(lp.outputs["Is Camera Ray"], mix.inputs[0])
nt.links.new(fill.outputs[0], mix.inputs[1])
nt.links.new(page.outputs[0], mix.inputs[2])
nt.links.new(mix.outputs[0], out_node.inputs["Surface"])

sun_data = bpy.data.lights.new("Key", "SUN")
sun_data.energy = 2.9
sun_data.angle = math.radians(14)
sun = bpy.data.objects.new("Key", sun_data)
scene.collection.objects.link(sun)
sun.rotation_euler = Vector((0.68, -0.6, -0.46)).normalized().to_track_quat("-Z", "Y").to_euler()

cam_data = bpy.data.cameras.new("Cam")
cam_data.type = "ORTHO"
cam_data.ortho_scale = max(LAYOUT["w"], LAYOUT["h"]) / PPM
cam = bpy.data.objects.new("Cam", cam_data)
scene.collection.objects.link(cam)
cx, cy = world(LAYOUT["w"] / 2, LAYOUT["h"] / 2)
cam.location = (cx, cy, 20)
scene.camera = cam

M = dict(
    water=material("Water", WATER, 0.3), deep=material("WaterDeep", DEEP, 0.34), hilite=material("Highlight", HILITE, 0.4),
    foam=material("Foam", FOAM, 0.5), body=material("PelicanBody", BODY, 0.7), stripe=material("WingStripe", STRIPE, 0.7),
    beak=material("Beak", BEAK, 0.55), rain=material("Rain", WATER, 0.4, blended=True), ring=material("Splash", WATER, 0.4, blended=True),
)

# ------------------------------------------------------------------ logo from the SVG
parts = import_svg(os.path.join(REF, "fludd-logo.svg"))
assert len(parts) == 14, f"expected 14 logo parts, got {len(parts)}: {[p.name for p in parts]}"
wave_deep, wave_hi, band, b1, b2, b3, b4, tail, body, stripe, neck, head, beak, eye = parts
lo, hi = bounds([wave_deep, band])
K0 = (hi.x - lo.x) / 200.0  # importer metres per SVG unit (the wave spans the full 200-unit width)


def imp(sx: float, sy: float, z_units: float = 0.0) -> Vector:
    """SVG units to the importer's space."""
    return Vector((lo.x + sx * K0, lo.y + (200 - sy) * K0, z_units * K0))


u = K0  # one SVG unit, in importer space
solid(wave_deep, M["deep"], 6 * u, 3.4 * u, 0)
tube(wave_hi, M["hilite"], 2.4 * u, 10.5 * u)
solid(band, M["water"], 9 * u, 3.6 * u, 3 * u)
solid(tail, M["body"], 4 * u, 1.6 * u, 17 * u)
solid(body, M["body"], 5 * u, 6 * u, 17 * u)
tube(stripe, M["stripe"], 1.5 * u, 28.4 * u)
tube(neck, M["body"], 4 * u, 20 * u)
solid(head, M["body"], 4 * u, 5 * u, 18 * u)
solid(beak, M["beak"], 2.5 * u, 1.8 * u, 19 * u)
solid(eye, M["foam"], 0.6 * u, 0.4 * u, 27.2 * u)
for old in (b1, b2, b3, b4):
    bpy.data.objects.remove(old, do_unlink=True)
beads = [sphere(f"Bead{i + 1}", imp(sx, sy + 40, 12), r * u, M["foam"])
         for i, (sx, sy, r) in enumerate([(151.5, 33.8, 5), (168.7, 46.7, 5), (177.7, 61.6, 4.5), (138, 30, 3.5)])]

shadow_mat = bpy.data.materials.new("ContactShadow")
shadow_mat.use_nodes = True
try:
    shadow_mat.surface_render_method = "BLENDED"
except Exception:
    shadow_mat.blend_method = "BLEND"
sn = shadow_mat.node_tree
sb = sn.nodes["Principled BSDF"]
sb.inputs["Base Color"].default_value = lin("#1c2a44")
sb.inputs["Roughness"].default_value = 1.0
tc = sn.nodes.new("ShaderNodeTexCoord")
mp = sn.nodes.new("ShaderNodeMapping")
mp.inputs["Location"].default_value = (-1.0, -1.0, 0)
mp.inputs["Scale"].default_value = (2.0, 2.0, 1.0)
gr = sn.nodes.new("ShaderNodeTexGradient")
gr.gradient_type = "SPHERICAL"
mul = sn.nodes.new("ShaderNodeMath")
mul.operation = "MULTIPLY"
mul.inputs[1].default_value = 0.2
sn.links.new(tc.outputs["Generated"], mp.inputs["Vector"])
sn.links.new(mp.outputs["Vector"], gr.inputs["Vector"])
sn.links.new(gr.outputs["Fac"], mul.inputs[0])
sn.links.new(mul.outputs[0], sb.inputs["Alpha"])
bpy.ops.mesh.primitive_plane_add(size=1, location=imp(100, 199, -2))
ground_shadow = bpy.context.active_object
ground_shadow.name = "ContactShadow"
ground_shadow.scale = (250 * u, 30 * u, 1)
ground_shadow.data.materials.append(shadow_mat)
try:
    ground_shadow.visible_shadow = False
except Exception:
    pass

logo = empty("Logo", imp(100, 100))
wave_rig = empty("WaveRig", imp(100, 200))
pel_rig = empty("PelicanRig", imp(124, 62))
for rig in (wave_rig, pel_rig):
    adopt(rig, logo)
for o in (wave_deep, wave_hi, band, ground_shadow, *beads):
    adopt(o, wave_rig)
for o in (tail, body, stripe, neck, head, beak, eye):
    adopt(o, pel_rig)
S = 0.01 / K0  # final size: 200 SVG units = 2 m
logo.location = (0, 0, 0)
logo.scale = (S, S, S)

# ------------------------------------------------------------------ rain (0.00 to 0.95 s)
random.seed(19)
tilt = math.radians(19)
direction = Vector((-math.sin(tilt), -math.cos(tilt), 0))
travel = 1100 / PPM
rain = empty("Rain", (*world(LAYOUT["w"] / 2, 150), -1.0))
for i in range(LAYOUT["streaks"]):
    length = random.uniform(26, 42) / PPM
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=1.6 / PPM, depth=length)
    s = bpy.context.active_object
    s.name = f"Streak{i:02d}"
    s.data.materials.append(M["rain"])
    s.rotation_euler = (math.radians(90), 0, -tilt)
    start = Vector((*world(random.uniform(0, LAYOUT["rain_w"]), -60), -1.0))
    duration = random.uniform(0.5, 0.71) * FPS
    f0 = 1 - random.random() * duration
    s.location = start
    adopt(s, rain)
    s.location = rain.matrix_world.inverted() @ start
    key(s, "location", round(f0), "LINEAR")
    s.location = rain.matrix_world.inverted() @ (start + direction * travel)
    key(s, "location", round(f0 + duration), "LINEAR")
    for fc in fcurves_of(s):
        fc.modifiers.new("CYCLES")
rain_alpha = M["rain"].node_tree.nodes["Principled BSDF"].inputs["Alpha"]
rain_alpha.default_value = 0.8
rain_alpha.keyframe_insert("default_value", frame=frame_at(0.45))
rain.scale = (1, 1, 1)
key(rain, "scale", frame_at(0.45), "SINE", "EASE_IN")
rain_alpha.default_value = 0.0
rain_alpha.keyframe_insert("default_value", frame=frame_at(0.95))
rain.scale = (2.2, 2.2, 1)
key(rain, "scale", frame_at(0.95))
rain.hide_render = False
rain.keyframe_insert("hide_render", frame=frame_at(0.95))
for s in rain.children:
    s.hide_render = False
    s.keyframe_insert("hide_render", frame=frame_at(0.95))
    s.hide_render = True
    s.keyframe_insert("hide_render", frame=frame_at(0.95) + 1)

# ------------------------------------------------------------------ hero drop (0.45 to 1.18 s)
drop_parts = import_svg(os.path.join(REF, "drop.svg"))
drop_body, drop_hi = drop_parts[0], drop_parts[1]
solid(drop_body, M["water"], 4 * u, 3.5 * u, 0)
tube(drop_hi, M["foam"], 1.2 * u, 8.5 * u)
dlo, dhi = bounds([drop_body])
drop = empty("Drop", ((dlo.x + dhi.x) / 2, (dlo.y + dhi.y) / 2, 0))
for o in drop_parts:
    adopt(o, drop)
DS = (1 / PPM) / K0  # one SVG unit of the drop = one design pixel
x0, y0 = world(*LAYOUT["drop"])
drop.location = (x0, y0, 0.6)
f_form, f_fall, f_hit = frame_at(0.45), frame_at(0.90), frame_at(1.18)
drop.scale = (0, 0, 0)
key(drop, "scale", f_form - 1, "CONSTANT")
drop.scale = (0.2 * DS, 0.7 * DS, DS)
drop.rotation_euler = (0, 0, -tilt)
key(drop, "scale", f_form, "CUBIC", "EASE_OUT")
key(drop, "rotation_euler", f_form, "CUBIC", "EASE_OUT")
drop.scale = (DS, DS, DS)
drop.rotation_euler = (0, 0, 0)
key(drop, "scale", f_fall)
key(drop, "rotation_euler", f_fall)
key(drop, "location", f_fall, "QUAD", "EASE_IN")
drop.location = (x0, y0 - LAYOUT["fall"] / PPM, 0.6)
drop.scale = (0.9 * DS, 1.12 * DS, DS)  # stretches as it accelerates
key(drop, "location", f_hit)
key(drop, "scale", f_hit, "CONSTANT")
drop.scale = (0, 0, 0)
key(drop, "scale", f_hit + 1, "CONSTANT")

# ------------------------------------------------------------------ impact (1.15 to 1.65 s)
rx, ry = world(*LAYOUT["ring"])
bpy.ops.mesh.primitive_torus_add(major_radius=60 / PPM, minor_radius=2.6 / PPM, major_segments=64, minor_segments=8, location=(rx, ry, 0.5))
ring = bpy.context.active_object
ring.name = "SplashRing"
ring.data.materials.append(M["ring"])
f_ring0, f_ring1 = frame_at(1.15), frame_at(1.65)
ring_alpha = M["ring"].node_tree.nodes["Principled BSDF"].inputs["Alpha"]
ring.scale = (0, 0, 0)
key(ring, "scale", f_ring0 - 1, "CONSTANT")
ring.scale = (0.1, 0.1 * (20 / 120), 1)
key(ring, "scale", f_ring0, "CUBIC", "EASE_OUT")
ring_alpha.default_value = 1.0
ring_alpha.keyframe_insert("default_value", frame=f_ring0 + 2)
ring.scale = (1.6, 1.6 * (20 / 120), 1)
key(ring, "scale", f_ring1, "CONSTANT")
ring_alpha.default_value = 0.0
ring_alpha.keyframe_insert("default_value", frame=f_ring1)
ring.scale = (0, 0, 0)
key(ring, "scale", f_ring1 + 1, "CONSTANT")
for i in range(7):  # a short crown of droplets
    ang = math.radians(20 + i * 23.3)
    d = sphere(f"Crown{i}", (rx, ry, 0.55), random.uniform(3.0, 5.5) / PPM, M["water"])
    reach, height = random.uniform(40, 75) / PPM, random.uniform(45, 85) / PPM
    d.scale = (0, 0, 0)
    key(d, "scale", f_ring0 - 1, "CONSTANT")
    d.scale = (1, 1, 1)
    key(d, "scale", f_ring0, "LINEAR")
    key(d, "location", f_ring0, "QUAD", "EASE_OUT")
    d.location = (rx + math.cos(ang) * reach * 0.6, ry + height, 0.55)
    key(d, "location", f_ring0 + 5, "QUAD", "EASE_IN")
    d.location = (rx + math.cos(ang) * reach, ry - 4 / PPM, 0.55)
    d.scale = (0.5, 0.5, 0.5)
    key(d, "location", f_ring0 + 11)
    key(d, "scale", f_ring0 + 11, "CONSTANT")
    d.scale = (0, 0, 0)
    key(d, "scale", f_ring0 + 12, "CONSTANT")

# ------------------------------------------------------------------ wave rises (1.20 to 1.85 s), beads pop, pelican lands
f_rise0, f_rise1 = frame_at(1.20), frame_at(1.85)
wave_rig.scale = (0, 0, 0)
key(wave_rig, "scale", f_rise0 - 1, "CONSTANT")
wave_rig.scale = (0.5, 0.02, 1)
key(wave_rig, "scale", f_rise0, "QUART", "EASE_OUT")
wave_rig.scale = (1, 1, 1)
key(wave_rig, "scale", f_rise1, "SINE", "EASE_IN_OUT")
for i, bead in enumerate(beads):
    f = frame_at(1.70 + 0.05 * i)
    full = tuple(bead.scale)
    bead.scale = (0, 0, 0)
    key(bead, "scale", f, "BACK", "EASE_OUT")
    bead.scale = full
    key(bead, "scale", f + 8)

f_land0, f_land1 = frame_at(1.80), frame_at(2.20)
rest = pel_rig.location.copy()
pel_rig.scale = (0, 0, 0)
key(pel_rig, "scale", f_land0 - 1, "CONSTANT")
pel_rig.scale = (0.82, 0.82, 0.82)
pel_rig.location = rest + Vector((22.5 * u, 25 * u, 0))
pel_rig.rotation_euler = (0, 0, math.radians(-10))
key(pel_rig, "scale", f_land0, "CUBIC", "EASE_OUT")
key(pel_rig, "location", f_land0, "QUART", "EASE_OUT")
key(pel_rig, "rotation_euler", f_land0, "CUBIC", "EASE_OUT")
pel_rig.location = rest
pel_rig.scale = (1.07, 0.9, 1)  # squash on touchdown
pel_rig.rotation_euler = (0, 0, math.radians(2))
key(pel_rig, "location", f_land1)
key(pel_rig, "scale", f_land1, "SINE", "EASE_OUT")
key(pel_rig, "rotation_euler", f_land1, "SINE", "EASE_OUT")
pel_rig.scale = (1, 1, 1)
pel_rig.rotation_euler = (0, 0, 0)
key(pel_rig, "scale", f_land1 + 6)
key(pel_rig, "rotation_euler", f_land1 + 6)

# ------------------------------------------------------------------ hold (2.95 to 4.30 s): a little life
f_hold0, f_hold1 = frame_at(2.2), frame_at(4.30)
key(wave_rig, "scale", f_hold0 + 6, "SINE", "EASE_IN_OUT")
wave_rig.scale = (1.0, 1.018, 1)
key(wave_rig, "scale", f_hold0 + 30, "SINE", "EASE_IN_OUT")
wave_rig.scale = (1, 1, 1)
key(wave_rig, "scale", f_hold0 + 56, "SINE", "EASE_IN_OUT")
hx = wave_hi.location.x
key(wave_hi, "location", f_hold0, "SINE", "EASE_IN_OUT")
wave_hi.location.x = hx + 2.2 * u
key(wave_hi, "location", f_hold0 + 32, "SINE", "EASE_IN_OUT")
wave_hi.location.x = hx
key(wave_hi, "location", f_hold1)
blink = frame_at(3.45)
eye_scale = tuple(eye.scale)
key(eye, "scale", blink)
eye.scale = (eye_scale[0], eye_scale[1] * 0.12, eye_scale[2])
key(eye, "scale", blink + 2)
eye.scale = eye_scale
key(eye, "scale", blink + 5)
key(cam_data, "ortho_scale", frame_at(2.2), "SINE", "EASE_IN_OUT")
cam_data.ortho_scale *= 0.98
key(cam_data, "ortho_scale", f_hold1)

# ------------------------------------------------------------------ handoff (4.30 to 4.80 s)
f_out0, f_out1 = frame_at(4.30), frame_at(4.80)
key(logo, "location", f_out0, "CUBIC", "EASE_IN")
key(logo, "scale", f_out0, "CUBIC", "EASE_IN")
hx_, hy_ = world(*LAYOUT["handoff"])
logo.location = (hx_, hy_, 0)
logo.scale = (S * 0.3, S * 0.3, S * 0.3)
key(logo, "location", f_out1)
key(logo, "scale", f_out1, "CONSTANT")
logo.scale = (0, 0, 0)
key(logo, "scale", f_out1 + 1, "CONSTANT")

apply_interpolation()

# ------------------------------------------------------------------ output
os.makedirs(OUT, exist_ok=True)
if MODE == "stills":
    scene.render.resolution_percentage = 50
    for f in (6, 14, 24, 32, 36, 38, 40, 46, 56, 62, 67, 90, 105, 131, 138, 144):
        scene.frame_set(f)
        scene.render.filepath = os.path.join(OUT, f"{VARIANT}_f{f:03d}.png")
        bpy.ops.render.render(write_still=True)
else:
    scene.render.filepath = os.path.join(OUT, VARIANT, "f_")
    bpy.ops.render.render(animation=True)
    if VARIANT == "desktop":
        bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE, "fludd-boot.blend"))
print(f"FLUDD_BOOT_DONE {VARIANT} {MODE} K0={K0:.6f}")
