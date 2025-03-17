import { defs, tiny } from './examples/common.js';
// Pull these names into this module's scope for convenience:
const { vec3, vec4, vec, color, Mat4, Light, Material, Texture, Scene } = tiny;
const { Cube, Axis_Arrows, Textured_Phong, Phong_Shader, Basic_Shader, Subdivision_Sphere } = defs;
import { Shape_From_File } from './examples/obj-file-demo.js';
import {
    Color_Phong_Shader, Shadow_Textured_Phong_Shader,
    Depth_Texture_Shader_2D, Buffered_Texture, LIGHT_DEPTH_TEX_SIZE
} from './examples/shadow-demo-shaders.js';

/* ============================================================
   Inlined Mini-Figure Definitions (using Basic_Shader & Textures)
   ============================================================ */

// Simple Node class for hierarchical drawing.
class Node {
    constructor(name, shape, transform, material) {
        this.name = name;
        this.shape = shape;
        this.transform = transform; // relative transform (Mat4)
        this.material = material;
        this.children = [];
    }
    draw(context, program_state, parent_transform) {
        let M = parent_transform.times(this.transform);
        this.shape.draw(context, program_state, M, this.material);
        for (let child of this.children) {
            child.draw(context, program_state, M);
        }
    }
}

// Mini_Figure builds a LEGO minifigure from several parts.
class Mini_Figure {
    constructor(origin = vec3(0, 3, 0), scale = vec3(1, 1, 1)) {
        // Load shapes for each LEGO part.
        this.parts = {
            hair: new Shape_From_File("lego_models/minifigure/hair/hair.obj"),
            head: new Shape_From_File("lego_models/minifigure/head/head.obj"),
            body: new Shape_From_File("lego_models/minifigure/body/body.obj"),
            left_arm: new Shape_From_File("lego_models/minifigure/left_arm/left_arm.obj"),
            left_hand: new Shape_From_File("lego_models/minifigure/left_hand/left_hand.obj"),
            left_leg: new Shape_From_File("lego_models/minifigure/left_leg/left_leg.obj"),
            right_arm: new Shape_From_File("lego_models/minifigure/right_arm/right_arm.obj"),
            right_hand: new Shape_From_File("lego_models/minifigure/right_hand/right_hand.obj"),
            right_leg: new Shape_From_File("lego_models/minifigure/right_leg/right_leg.obj")
        };

        // Define materials.
        this.mats = {
            hairMat: { shader: new Color_Phong_Shader(), ambient: 1, diffusivity: 1, specularity: 1, color: color(0.17, 0.1, 0.0, 1) },
            headMat: {
                shader: new Phong_Shader(), ambient: 1, diffusivity: 1, specularity: 1,
                color_texture: new Texture("lego_models/minifigure/head/textures/2/official/color/3626d1304.png"),
                color: color(0.94, 0.57, 0.01, 1)
            },
            bodyMat: { shader: new Phong_Shader(), ambient: 1, diffusivity: 1, specularity: 1, color: color(0.05, 0.05, 0.05, 1) },
            left_armMat: { shader: new Color_Phong_Shader(), ambient: 1, diffusivity: 1, specularity: 1, color: color(0.05, 0.05, 0.05, 1) },
            left_handMat: { shader: new Color_Phong_Shader(), ambient: 1, diffusivity: 1, specularity: 1, color: color(0.94, 0.57, 0.01, 1) },
            left_legMat: {
                shader: new Phong_Shader(), ambient: 1, diffusivity: 1, specularity: 1,
                color_texture: new Texture("lego_models/minifigure/left_leg/textures/2/official/color/3817d395.png"),
                color: color(0.12, 0.17, 0.26, 1)
            },
            right_armMat: { shader: new Color_Phong_Shader(), ambient: 1, diffusivity: 1, specularity: 1, color: color(0.05, 0.05, 0.05, 1) },
            right_handMat: { shader: new Color_Phong_Shader(), ambient: 1, diffusivity: 1, specularity: 1, color: color(0.94, 0.57, 0.01, 1) },
            right_legMat: {
                shader: new Phong_Shader(), ambient: 1, diffusivity: 1, specularity: 1,
                color_texture: new Texture("lego_models/minifigure/right_leg/textures/2/official/color/3816d395.png"),
                color: color(0.12, 0.17, 0.26, 1)
            }
        };

        // Define per-part transforms.
        const body_transform = Mat4.identity().times(Mat4.translation(0, -1, 0));
        const head_transform = Mat4.translation(0, 2, 0).times(Mat4.scale(0.65, 0.65, 0.65));
        const hair_transform = Mat4.translation(0, .3, 0).times(Mat4.scale(1.2, 1.2, 1.25));;
        const left_arm_transform = Mat4.translation(1, 0.25, 0).times(Mat4.scale(0.5, 0.5, 0.5));
        const right_arm_transform = Mat4.translation(-1, 0.25, 0).times(Mat4.scale(0.5, 0.5, 0.5));
        const left_hand_transform = Mat4.translation(0.75, 0.5, 0).times(Mat4.translation(0, -2.2, 0.5));
        const right_hand_transform = Mat4.translation(-0.75, 0.5, 0).times(Mat4.translation(0, -2.2, 0.5));
        const left_leg_transform = Mat4.translation(0.4, -1.6, 0).times(Mat4.scale(0.65, 0.65, 0.65));
        const right_leg_transform = Mat4.translation(-0.4, -1.6, 0).times(Mat4.scale(0.65, 0.65, 0.65));
        // Build hierarchy.
        this.body_node = new Node("body", this.parts.body, body_transform, this.mats.bodyMat);
        this.head_node = new Node("head", this.parts.head, head_transform, this.mats.headMat);
        this.body_node.children.push(this.head_node);
        this.hair_node = new Node("hair", this.parts.hair, hair_transform, this.mats.hairMat);
        this.head_node.children.push(this.hair_node);

        this.left_arm_node = new Node("left_arm", this.parts.left_arm, left_arm_transform, this.mats.left_armMat);
        this.right_arm_node = new Node("right_arm", this.parts.right_arm, right_arm_transform, this.mats.right_armMat);
        this.body_node.children.push(this.left_arm_node);
        this.body_node.children.push(this.right_arm_node);
        this.left_hand_node = new Node("left_hand", this.parts.left_hand, left_hand_transform, this.mats.left_handMat);
        this.right_hand_node = new Node("right_hand", this.parts.right_hand, right_hand_transform, this.mats.right_handMat);
        this.left_arm_node.children.push(this.left_hand_node);
        this.right_arm_node.children.push(this.right_hand_node);
        this.left_leg_node = new Node("left_leg", this.parts.left_leg, left_leg_transform, this.mats.left_legMat);
        this.right_leg_node = new Node("right_leg", this.parts.right_leg, right_leg_transform, this.mats.right_legMat);
        this.body_node.children.push(this.left_leg_node);
        this.body_node.children.push(this.right_leg_node);
        // Overall mini-figure transform.
        this.rootMat = Mat4.translation(origin[0], origin[1], origin[2])
            .times(Mat4.scale(scale[0], scale[1], scale[2]));
    }

    // Draw the mini-figure.
    draw(context, program_state, model_transform = Mat4.identity()) {
        let M = this.rootMat.times(model_transform);
        this.body_node.draw(context, program_state, M);
    }

    // Move the mini-figure by post-multiplying its root matrix.
    move_mini_fig(move) {
        this.rootMat.post_multiply(move);
    }
}

/* ============================================================
   Scene: Shadow_Demo
   ============================================================ */

const SquareShape = class SquareShape extends tiny.Vertex_Buffer {
    constructor() {
        super("position", "normal", "texture_coord");
        this.arrays.position = [
            vec3(0, 0, 0), vec3(1, 0, 0), vec3(0, 1, 0),
            vec3(1, 1, 0), vec3(1, 0, 0), vec3(0, 1, 0)
        ];
        this.arrays.normal = [
            vec3(0, 0, 1), vec3(0, 0, 1), vec3(0, 0, 1),
            vec3(0, 0, 1), vec3(0, 0, 1), vec3(0, 0, 1)
        ];
        this.arrays.texture_coord = [
            vec(0, 0), vec(1, 0), vec(0, 1),
            vec(1, 1), vec(1, 0), vec(0, 1)
        ];
    }
};

export class Shadow_Demo extends Scene {
    constructor() {
        super();
        // Load model files.
        this.shapes = {
            "teapot": new Shape_From_File("assets/teapot.obj"),
            "sphere": new Subdivision_Sphere(6),
            "cube": new Cube(),
            "square_2d": new SquareShape(),
            "greenBasePlate": new Shape_From_File("lego_models/greenBasePlate/floor.obj"),
            // Use our inlined Mini_Figure.
            "mini_fig": new Mini_Figure(vec3(0, 3, 0), vec3(1, 1, 1)),
            "roof": new Shape_From_File("lego_models/background_house/roof/roof.obj"),
            "walls": new Shape_From_File("lego_models/background_house/walls/background_house.obj")
        };

        // Materials.
        this.stars = new Material(new Shadow_Textured_Phong_Shader(1), {
            color: color(0.5, 0.5, 0.5, 1),
            ambient: 0.4, diffusivity: 1, specularity: 0.5,
            color_texture: new Texture("assets/stars.png"),
            light_depth_texture: null
        });
        this.floor = new Material(new Shadow_Textured_Phong_Shader(1), {
            color: color(1, 1, 1, 1),
            ambient: 0.3, diffusivity: 0.6, specularity: 0.4, smoothness: 64,
            color_texture: null, light_depth_texture: null
        });
        // For consistency, use Basic_Shader for objects drawn like the teapot.
        this.pure = new Material(new Basic_Shader(), {});
        this.light_src = new Material(new Basic_Shader(), { color: color(1, 1, 1, 1) });
        this.depth_tex = new Material(new Depth_Texture_Shader_2D(), {
            color: color(0, 0, 0, 1),
            ambient: 1, diffusivity: 0, specularity: 0, texture: null
        });
        this.legoFloor = new Material(new Shadow_Textured_Phong_Shader(1), {
            color: color(0.5, 0.5, 0.5, 1),
            ambient: 1, diffusivity: 0.5, specularity: 0.5,
            color_texture: new Texture("lego_models/greenBasePlate/greenBasePlate.mtl"),
            light_depth_texture: null
        });
        this.roof = new Material(new Shadow_Textured_Phong_Shader(1), {
            color: color(0.5, 0.5, 0.5, 1),
            ambient: 0.4, diffusivity: 0.5, specularity: 0.5,
            color_texture: new Texture("lego_models/background_house/roof/roof.png"),
            light_depth_texture: null
        });

        this.init_ok = false;

        // --- Mini-Figure Movement Variables ---
        this.mini_fig_position = vec3(0, 3, 0);
        this.mini_fig_velocity = vec3(0, 0, 0);
        this.gravity = -20;
        this.bounceCoefficient = 0.7;
        this.bounceThreshold = 0.5;
        // Use arrow keys to move the mini-figure horizontally.
        this.mini_fig_speed = 2;
        // We'll also store the facing angle (in radians).
        this.mini_fig_angle = 0;
        this.mini_fig_keyState = {
            "arrowleft": false,
            "arrowright": false,
            "arrowup": false,
            "arrowdown": false
        };
        window.addEventListener("keydown", (e) => {
            let key = e.key.toLowerCase();
            if (["arrowleft", "arrowright", "arrowup", "arrowdown"].includes(key)) {
                this.mini_fig_keyState[key] = true;
                e.preventDefault();
            }
        });
        window.addEventListener("keyup", (e) => {
            let key = e.key.toLowerCase();
            if (["arrowleft", "arrowright", "arrowup", "arrowdown"].includes(key)) {
                this.mini_fig_keyState[key] = false;
                e.preventDefault();
            }
        });
    }

    make_control_panel() {
        // Button to drop the mini-figure.
        this.key_triggered_button("Drop Mini Figure", ["t"], () => {
            this.mini_fig_position = vec3(this.mini_fig_position[0], 10, this.mini_fig_position[2]);
            this.mini_fig_velocity = vec3(0, 0, 0);
        });
    }

    texture_buffer_init(gl) {
        this.lightDepthTexture = gl.createTexture();
        this.light_depth_texture = new Buffered_Texture(this.lightDepthTexture);
        this.stars.light_depth_texture = this.light_depth_texture;
        this.floor.light_depth_texture = this.light_depth_texture;
        this.lightDepthTextureSize = LIGHT_DEPTH_TEX_SIZE;
        gl.bindTexture(gl.TEXTURE_2D, this.lightDepthTexture);
        gl.texImage2D(
            gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT,
            this.lightDepthTextureSize, this.lightDepthTextureSize,
            0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null
        );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        this.lightDepthFramebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.lightDepthFramebuffer);
        gl.framebufferTexture2D(
            gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT,
            gl.TEXTURE_2D, this.lightDepthTexture, 0
        );
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        this.unusedTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.unusedTexture);
        gl.texImage2D(
            gl.TEXTURE_2D, 0, gl.RGBA,
            this.lightDepthTextureSize, this.lightDepthTextureSize,
            0, gl.RGBA, gl.UNSIGNED_BYTE, null
        );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.framebufferTexture2D(
            gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
            gl.TEXTURE_2D, this.unusedTexture, 0
        );
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    render_scene(context, program_state, shadow_pass, draw_light_source = false, draw_shadow = false) {
        const t = program_state.animation_time;
        let light_position = this.light_position;
        let light_color = this.light_color;
        program_state.draw_shadow = draw_shadow;
        if (draw_light_source && shadow_pass) {
            this.shapes.sphere.draw(context, program_state,
                Mat4.translation(light_position[0], light_position[1], light_position[2])
                    .times(Mat4.scale(0.5, 0.5, 0.5)),
                this.light_src.override({ color: light_color })
            );
        }
        // Draw teapots (for comparison, remain unchanged)
        for (let i of [-1, 1]) {
            const model_transform = Mat4.translation(
                5 * i,
                this.teapot_position ? this.teapot_position[1] : 3,
                0
            )
                .times(Mat4.rotation(t / 1000, -1, 2, 0))
                .times(Mat4.rotation(-Math.PI / 2, 1, 0, 0));
            this.shapes.teapot.draw(context, program_state, model_transform,
                shadow_pass ? this.floor : this.pure);
        }
        // Draw the mini-figure.
        // Combine rotation (to face the movement direction) with translation.
        let mini_transform = Mat4.translation(this.mini_fig_position[0], this.mini_fig_position[1], this.mini_fig_position[2])
            .times(Mat4.rotation(this.mini_fig_angle, 0, 1, 0));

        this.shapes.mini_fig.draw(context, program_state, mini_transform, this.pure);
        // Draw Lego Floor.
        let greenBasePlate_transform = Mat4.scale(10, 10, 10);
        this.shapes.greenBasePlate.draw(context, program_state, greenBasePlate_transform,
            shadow_pass ? this.legoFloor : this.pure);
        // Draw the Roof.
        let roof_transform = Mat4.identity().times(Mat4.translation(0, 0, 0)).times(Mat4.scale(1, 1, 1));
        this.shapes.roof.draw(context, program_state, roof_transform,
            shadow_pass ? this.floor : this.pure);
    }

    display(context, program_state) {
        const t = program_state.animation_time;
        const gl = context.context;
        if (!this.init_ok) {
            const ext = gl.getExtension('WEBGL_depth_texture');
            if (!ext) return alert('need WEBGL_depth_texture');
            this.texture_buffer_init(gl);
            this.init_ok = true;
        }
        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            program_state.set_camera(Mat4.look_at(
                vec3(0, 12, 12),
                vec3(0, 2, 0),
                vec3(0, 1, 0)
            ));
        }
        this.light_position = Mat4.rotation(t / 1500, 0, 1, 0)
            .times(vec4(3, 6, 0, 1));
        this.light_color = color(
            0.667 + Math.sin(t / 500) / 3,
            0.667 + Math.sin(t / 1500) / 3,
            0.667 + Math.sin(t / 3500) / 3,
            1
        );
        this.light_view_target = vec4(0, 0, 0, 1);
        this.light_field_of_view = 130 * Math.PI / 180;
        program_state.lights = [new Light(this.light_position, this.light_color, 1000)];
        let dt = program_state.animation_delta_time / 1000;
        // --- Update Mini-Figure Horizontal Movement Using Arrow Keys ---
        let moveX = 0, moveZ = 0;
        if (this.mini_fig_keyState["arrowleft"]) { moveX -= 1; }
        if (this.mini_fig_keyState["arrowright"]) { moveX += 1; }
        if (this.mini_fig_keyState["arrowup"]) { moveZ -= 1; }
        if (this.mini_fig_keyState["arrowdown"]) { moveZ += 1; }
        // If there's movement, update position and facing angle.
        if (moveX !== 0 || moveZ !== 0) {
            // Update facing angle: Math.atan2 returns the angle in radians.
            this.mini_fig_angle = Math.atan2(moveX, moveZ);
            // Update horizontal position.
            this.mini_fig_position[0] += moveX * this.mini_fig_speed * dt;
            this.mini_fig_position[2] += moveZ * this.mini_fig_speed * dt;
        }
        // --- Update Mini-Figure Vertical Movement: Gravity & Bounce ---
        this.mini_fig_velocity[1] += this.gravity * dt;
        this.mini_fig_position[1] += this.mini_fig_velocity[1] * dt;
        if (this.mini_fig_position[1] < 1) {
            this.mini_fig_position[1] = 1;
            this.mini_fig_velocity[1] = -this.mini_fig_velocity[1] * this.bounceCoefficient;
            if (Math.abs(this.mini_fig_velocity[1]) < this.bounceThreshold)
                this.mini_fig_velocity[1] = 0;
        }
        const light_view_mat = Mat4.look_at(
            vec3(this.light_position[0], this.light_position[1], this.light_position[2]),
            vec3(this.light_view_target[0], this.light_view_target[1], this.light_view_target[2]),
            vec3(0, 1, 0)
        );
        const light_proj_mat = Mat4.perspective(this.light_field_of_view, 1, 0.5, 500);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.lightDepthFramebuffer);
        gl.viewport(0, 0, this.lightDepthTextureSize, this.lightDepthTextureSize);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        program_state.light_view_mat = light_view_mat;
        program_state.light_proj_mat = light_proj_mat;
        program_state.light_tex_mat = light_proj_mat;
        program_state.view_mat = light_view_mat;
        program_state.projection_transform = light_proj_mat;
        this.render_scene(context, program_state, false, false, false);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        program_state.view_mat = program_state.camera_inverse;
        program_state.projection_transform = Mat4.perspective(Math.PI / 4, context.width / context.height, 0.5, 500);
        this.render_scene(context, program_state, true, true, true);
        this.shapes.square_2d.draw(context, program_state,
            Mat4.translation(-0.99, 0.08, 0).times(Mat4.scale(0.5, 0.5 * gl.canvas.width / gl.canvas.height, 1)),
            this.depth_tex.override({ texture: this.lightDepthTexture })
        );
    }
}
