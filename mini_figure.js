import { tiny, defs } from './other/uncommon.js';
import { Shape_From_File } from './other/unobj-file-demo.js';
const { vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component } = tiny;

const shapes = {
    'hair': new Shape_From_File("lego_models/minifigure/hair/hair.obj"),
    'head': new Shape_From_File("lego_models/minifigure/head/head.obj"),
    'body': new Shape_From_File("lego_models/minifigure/body/body.obj"),
    'left_arm': new Shape_From_File("lego_models/minifigure/left_arm/left_arm.obj"),
    'left_hand': new Shape_From_File("lego_models/minifigure/left_hand/left_hand.obj"),
    'left_leg': new Shape_From_File("lego_models/minifigure/left_leg/left_leg.obj"),
    'right_arm': new Shape_From_File("lego_models/minifigure/right_arm/right_arm.obj"),
    'right_hand': new Shape_From_File("lego_models/minifigure/right_hand/right_hand.obj"),
    'right_leg': new Shape_From_File("lego_models/minifigure/right_leg/right_leg.obj"),

    ball: new defs.Subdivision_Sphere(4) // this will be used to see the joints in action
}

const phong = new defs.Phong_Shader();
const texturedPhong = new defs.Textured_Phong();
const bumpmap = new defs.Fake_Bump_Map(1);
const legoShader = new defs.Decal_Phong();

const pantsColor = color(0.11953842797895521, 0.171441100722554, 0.26225065751888765, 1);
const jacketColor = color(0.005181516700061659, 0.005181516700061659, 0.005181516700061659, 1);
const skinColor = color(0.9386857284565036, 0.5711248294565854, 0.009134058699157796, 1);
const hairColor = color(0.17, 0.1, 0.0, 1);

//if the material does not include texture, but only a color need to use phong shader
//if material has color and texture use legoShader
//if material has texture use legoShader as well
const materials = {
    hairMat: {
        shader: phong,
        ambient: 1,
        diffusivity: 1,
        specularity: 1,
        color: hairColor,
    },
    headMat: {
        shader: legoShader,
        ambient: 1,
        diffusivity: 1,
        specularity: 1,
        texture: new Texture("lego_models/minifigure/head/textures/2/official/color/3626d1304.png"),
        color: skinColor
    },
    bodyMat: {
        shader: legoShader,
        ambient: 1,
        diffusivity: 1,
        specularity: 1,
        texture: new Texture("lego_models/minifigure/body/textures/2/official/color/3814d1062.png"),
        color: jacketColor
    },
    left_armMat: {
        shader: phong,
        ambient: 1,
        diffusivity: 1,
        specularity: 1,
        color: jacketColor
    },
    left_handMat: {
        shader: phong,
        ambient: 1,
        diffusivity: 1,
        specularity: 1,
        color: skinColor
    },
    left_legMat: {
        shader: legoShader,
        ambient: 1,
        diffusivity: 1,
        specularity: 1,
        texture: new Texture("lego_models/minifigure/left_leg/textures/2/official/color/3817d395.png"),
        color: pantsColor
    },
    right_armMat: {
        shader: phong,
        ambient: 1,
        diffusivity: 1,
        specularity: 1,
        color: jacketColor
    },
    right_handMat: {
        shader: phong,
        ambient: 1,
        diffusivity: 1,
        specularity: 1,
        color: skinColor
    },
    right_legMat: {
        shader: legoShader,
        ambient: 1,
        diffusivity: 1,
        specularity: 1,
        texture: new Texture("lego_models/minifigure/right_leg/textures/2/official/color/3816d395.png"),
        color: pantsColor
    },
    plastic: { shader: phong, ambient: 0.2, diffusivity: 1, specularity: 0.5, color: color(0.9, 0.5, 0.9, 1) }, // to help see the joints
}

export const Mini_Figure =
    class Mini_Figure {
        constructor(
            origin = vec3(0, 3, 0), //origin point of the character. this is based at the bottom of the minifigure's feet
            scale = vec3(1, 1, 1), //scale of the minifigure (should not really need this because minifigures should be the same size)
        ) {
            /*
                Lego MiniFig has 
                root 
                neck: y rotation
                right shoulder, left shoulder: X rotation
                right wrist, left wrist
                right hip, left hip: X rotation
    
    
                root -> neck
                root -> shoulders -> wrists
                root -> hips
            */
            this.t_sim = 0; // global clock used for animations
            this.k = 30; // change this to speed up or slow down walk animation

            let scaleMat = Mat4.scale(scale[0], scale[1], scale[2]);
            let originMat = Mat4.translation(origin[0], origin[1], origin[2]);

            // direction = [x, z]
            // 1 -> facing positive axis
            // 0 -> perpendicular w/ axis
            // -1 -> facing negative axis
            // [0, 1] -> facing positive z-axis, perpendicular w/ x-axis
            // [1 -1] -> facing positive x-axis, negative z-axis
            this.direction = [0, 1];

            this.rootMat = originMat;

            //Torso
            // associated joint is the root
            const body_shape = shapes.body;
            const body_transform = Mat4.scale(1, 1, 1).times(Mat4.translation(0, -0.5, 0));
            this.body_node = new Node("body", body_shape, body_transform, materials.bodyMat);

            const root_location = originMat;
            this.root = new Arc("root", null, this.body_node, root_location);
            this.root.set_dof(true, true, true, true, true, true); // dof in all directions

            //Hair
            const hair_shape = shapes.hair;
            const hair_transform = Mat4.scale(0.85, 0.85, 0.85).times(Mat4.translation(0, 0.8, 0));
            this.hair_node = new Node("hair", hair_shape, hair_transform, materials.hairMat);

            //Head
            // associated joint is the neck
            const head_shape = shapes.head;
            const head_transform = Mat4.scale(0.7, 0.7, 0.7).times(Mat4.translation(0, 0.8, 0));
            this.head_node = new Node("head", head_shape, head_transform, materials.headMat);

            //make sure the hair draws:
            this.hair_arc = new Arc("hair_arc", this.head_node, this.hair_node, Mat4.identity());
            this.head_node.children_arcs.push(this.hair_arc);

            const neck_location = Mat4.translation(0, 1, 0);
            this.neck = new Arc("neck", this.body_node, this.head_node, neck_location);
            this.body_node.children_arcs.push(this.neck);
            this.neck.set_dof(false, true, false, false, false, false); // rotation around y

            //Left Arm
            //associated joint is the left shoulder
            const left_arm_shape = shapes.left_arm;
            const left_arm_transform = Mat4.scale(0.5, 0.5, 0.5).times(Mat4.translation(0.3, -1, 0));
            this.left_arm_node = new Node("left_arm", left_arm_shape, left_arm_transform, materials.left_armMat);

            const left_shoulder_location = Mat4.translation(0.75, 0.5, 0);
            this.left_shoulder = new Arc("left_shoulder", this.body_node, this.left_arm_node, left_shoulder_location);
            this.body_node.children_arcs.push(this.left_shoulder);
            this.left_shoulder.set_dof(true, false, false, false, false, false); // rotation around x

            //Left Hand
            //associated joint is the left wrist
            const left_hand_shape = shapes.left_hand;
            const left_hand_transform = Mat4.scale(0.4, 0.4, 0.4).times(Mat4.translation(0.15, -0.25, 0.5));
            this.left_hand_node = new Node("left_hand", left_hand_shape, left_hand_transform, materials.left_handMat);

            const left_wrist_location = Mat4.translation(0.55, -1.25, 0.3);
            this.left_wrist = new Arc("left_wrist", this.left_arm_node, this.left_hand_node, left_wrist_location);
            this.left_arm_node.children_arcs.push(this.left_wrist);
            this.left_wrist.set_dof(false, false, true, false, false, false); // rotation around z

            //Left Leg
            //associated joint is the left hip
            const left_leg_shape = shapes.left_leg;
            const left_leg_transform = Mat4.scale(0.6, 0.6, 0.6).times(Mat4.translation(0, -0.5, 0));
            this.left_leg_node = new Node("left_leg", left_leg_shape, left_leg_transform, materials.left_legMat);

            const left_hip_location = Mat4.translation(0.4, -1.6, 0);
            this.left_hip = new Arc("left_hip", this.body_node, this.left_leg_node, left_hip_location);
            this.body_node.children_arcs.push(this.left_hip);
            this.left_hip.set_dof(true, false, false, false, false, false); // rotation around x

            //Right Arm
            //associated join is the right shoulder
            const right_arm_shape = shapes.right_arm;
            const right_arm_transform = Mat4.scale(0.5, 0.5, 0.5).times(Mat4.translation(-0.3, -1, 0));
            this.right_arm_node = new Node("right_arm", right_arm_shape, right_arm_transform, materials.right_armMat);

            const right_shoulder_location = Mat4.translation(-0.75, 0.5, 0);
            // const right_shoulder_location = Mat4.identity();
            this.right_shoulder = new Arc("right_shoulder", this.body_node, this.right_arm_node, right_shoulder_location);
            this.body_node.children_arcs.push(this.right_shoulder);
            this.right_shoulder.set_dof(true, false, false, false, false, false); // rotation around x

            //Right Hand
            //associated joint is the right wrist
            const right_hand_shape = shapes.right_hand;
            const right_hand_transform = Mat4.scale(0.4, 0.4, 0.4).times(Mat4.translation(-0.15, -0.25, 0.5));
            this.right_hand_node = new Node("right_hand", right_hand_shape, right_hand_transform, materials.right_handMat);

            const right_wrist_location = Mat4.translation(-0.55, -1.25, 0.3);
            this.right_wrist = new Arc("right_wrist", this.right_arm_node, this.right_hand_node, right_wrist_location);
            this.right_arm_node.children_arcs.push(this.right_wrist);
            this.right_wrist.set_dof(false, false, true, false, false, false); // rotation around y

            //Right Leg
            //associated joint is the right hip
            const right_leg_shape = shapes.right_leg;
            const right_leg_transform = Mat4.scale(0.6, 0.6, 0.6).times(Mat4.translation(0, -0.5, 0));
            this.right_leg_node = new Node("right_leg", right_leg_shape, right_leg_transform, materials.right_legMat);

            const right_hip_location = Mat4.translation(-0.4, -1.6, 0);
            this.right_hip = new Arc("right_hip", this.body_node, this.right_leg_node, right_hip_location);
            this.body_node.children_arcs.push(this.right_hip);
            this.right_hip.set_dof(true, false, false, false, false, false); // rotation around x



            this.requestingBuild = false;
        }

        _rec_draw(arc, matrix, webgl_manager, uniforms) {
            if (arc !== null) {
                const L = arc.location_matrix;
                const A = arc.articulation_matrix;
                matrix.post_multiply(L.times(A));
                this.matrix_stack.push(matrix.copy());

                // used to see joints
                // shapes.ball.draw(webgl_manager, uniforms, matrix.times(Mat4.scale(0.3, 0.3, 0.3)), materials.plastic);

                const node = arc.child_node;
                const T = node.transform_matrix;
                matrix.post_multiply(T);
                node.shape.draw(webgl_manager, uniforms, matrix, node.material);

                matrix = this.matrix_stack.pop();
                for (const next_arc of node.children_arcs) {
                    this.matrix_stack.push(matrix.copy());
                    this._rec_draw(next_arc, matrix, webgl_manager, uniforms);
                    matrix = this.matrix_stack.pop();
                }
            }
        }

        draw(webgl_manager, uniforms) {
            //draw body parts:
            this.matrix_stack = [];
            this._rec_draw(this.root, Mat4.identity(), webgl_manager, uniforms);
        }

        getMiniFigPosition() {
            let M = this.rootMat;
            const origin = vec4(0, 0, 0, 1);
            const position = M.times(origin);

            const x = position[0];
            const y = position[1];
            const z = position[2];

            return vec3(x, y, z);
        }

        // moves mini-fig
        move_mini_fig(move) {
            this.rootMat.post_multiply(move);
            this.root.articulation_matrix = this.get_direction();
            this.move_animation();
        }

        move_animation() {
            // if you want a slower walk animation, decrease k (k is in the constructor)
            let angle = Math.sin(this.t_sim * Math.PI * 2 / this.k);
            this.left_shoulder.update_articulation(angle);
            this.right_shoulder.update_articulation(-angle);
            this.left_hip.update_articulation(angle);
            this.right_hip.update_articulation(-angle);
            this.t_sim += 1;
            this.t_sim = this.t_sim % this.k;
        }

        // build animation
        build() {
            //handle state of minifigure to pass along
            this.requestingBuild = true;

            this.root.articulation_matrix = this.get_direction().times(Mat4.rotation(Math.PI / 6, 1, 0, 0));
            let angle = 0.5 * Math.sin(this.t_sim * Math.PI * 2 / 10);
            this.left_shoulder.update_articulation(angle - (Math.PI / 6));
            this.right_shoulder.update_articulation(-angle - (Math.PI / 6));

            this.left_hip.articulation_matrix = Mat4.rotation(-Math.PI / 6, 1, 0, 0);
            this.right_hip.articulation_matrix = Mat4.rotation(-Math.PI / 6, 1, 0, 0);

            this.t_sim += 1;
            this.t_sim = this.t_sim % 10;
        }

        // positions mini-fig to rest position
        reset() {
            if (this.requestingBuild) {
                this.requestingBuild = false;
            }

            this.root.articulation_matrix = this.get_direction();
            this.left_shoulder.update_articulation(0);
            this.right_shoulder.update_articulation(0);
            this.left_hip.update_articulation(0);
            this.right_hip.update_articulation(0);
            this.t_sim = 0;
            // let angle = Math.sin(this.t_sim * Math.PI * 2 / this.k);
            // if(angle >= -0.05 && angle <= 0.05) { // reset location
            //     this.root.articulation_matrix = this.get_direction();
            //     this.left_shoulder.update_articulation(0);
            //     this.right_shoulder.update_articulation(0);
            //     this.left_hip.update_articulation(0);
            //     this.right_hip.update_articulation(0);
            //     this.t_sim = 0;
            // } else { // ensures smooth movement back to rest position
            //     this.left_shoulder.update_articulation(angle);
            //     this.right_shoulder.update_articulation(-angle);
            //     this.left_hip.update_articulation(angle);
            //     this.right_hip.update_articulation(-angle);
            //     if(this.t_sim <= 0.25*this.k || (this.t_sim <= 0.75*this.k && this.t_sim >= 0.5*this.k))
            //         this.t_sim -= 1;
            //     else
            //         this.t_sim += 1;
            // }
        }

        // returns direction of mini-fig
        get_direction() {
            let direction_matrix = Mat4.identity();

            if (this.direction[0] === 0 && this.direction[1] > 0)
                direction_matrix = Mat4.rotation(0, 0, 1, 0);
            else if (this.direction[0] === 0 && this.direction[1] < 0)
                direction_matrix = Mat4.rotation(Math.PI, 0, 1, 0);
            else if (this.direction[0] > 0 && this.direction[1] === 0)
                direction_matrix = Mat4.rotation(Math.PI / 2, 0, 1, 0);
            else if (this.direction[0] < 0 && this.direction[1] === 0)
                direction_matrix = Mat4.rotation(-Math.PI / 2, 0, 1, 0);
            else if (this.direction[0] > 0 && this.direction[1] > 0)
                direction_matrix = Mat4.rotation(Math.PI / 4, 0, 1, 0);
            else if (this.direction[0] > 0 && this.direction[1] < 0)
                direction_matrix = Mat4.rotation(3 * Math.PI / 4, 0, 1, 0);
            else if (this.direction[0] < 0 && this.direction[1] > 0)
                direction_matrix = Mat4.rotation(-Math.PI / 4, 0, 1, 0);
            else if (this.direction[0] < 0 && this.direction[1] < 0)
                direction_matrix = Mat4.rotation(-3 * Math.PI / 4, 0, 1, 0);

            return direction_matrix;
        }

    }

export class Arc {
    constructor(name, parent, child, location) {
        this.name = name;
        this.parent_node = parent;
        this.child_node = child;
        this.location_matrix = location;
        this.articulation_matrix = Mat4.identity();
        this.end_effector = null;
        this.dof = {
            //Rotations:
            Rx: false,
            Ry: false,
            Rz: false,
            //Translations:
            Tx: false,
            Ty: false,
            Tz: false
        }
    }

    set_dof(rx, ry, rz, tx, ty, tz) {
        //Rotational:
        this.dof.Rx = rx;
        this.dof.Ry = ry;
        this.dof.Rz = rz;

        //Translational:
        this.dof.Tx = tx;
        this.dof.Ty = ty;
        this.dof.Tz = tz;
    }

    update_articulation(theta) {
        this.articulation_matrix = Mat4.identity();
        if (this.dof.Rx) { this.articulation_matrix.pre_multiply(Mat4.rotation(theta, 1, 0, 0)); }
        if (this.dof.Ry) { this.articulation_matrix.pre_multiply(Mat4.rotation(theta, 0, 1, 0)); }
        if (this.dof.Rz) { this.articulation_matrix.pre_multiply(Mat4.rotation(theta, 0, 0, 1)); }
    }

}
export class Node {
    constructor(name, shape, transform, material) {
        this.name = name;
        this.shape = shape;
        this.transform_matrix = transform;
        this.parent_arc = null;
        this.children_arcs = [];
        this.material = material;
    }
}
export class End_Effector {
    constructor(name, parent, local_position) {
        this.name = name;
        this.parent = parent;
        this.local_position = local_position;
        this.global_position = null;
    }
}
