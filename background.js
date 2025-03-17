import { tiny, defs } from "./examples/common.js";
import { Shape_From_File } from "./examples/obj-file-demo.js";
const { vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component } = tiny;

export const House = 
class House{
    constructor(rootPosition = vec3(0,0,0), scale = vec3(1,1,1)){
        this.shapes = {
            roof: new defs.Shape_From_File("lego_models/background_house/roof/background_house.obj"),
            walls: new defs.Shape_From_File("lego_models/background_house/walls/background_house.obj")
        }
        const legoShader = new defs.Decal_Phong();
        this.materials = {
            roofMat:{
                shader: legoShader,
                ambient: 1,
                diffusitivity: 1,
                specularity: 1,
                color: color(1,0,0,1)
            },
            wallsMat:{
                shader: legoShader,
                ambient: 1,
                diffusitivity: 1,
                specularity: 1,
                color: color(0.4, 0.2, 0,1),

            }
        }

        this.transforms = {
            houseTransform: Mat4.identity()
                            .times(Mat4.translation(rootPosition[0], rootPosition[1], rootPosition[2]))
                            .times(Mat4.scale(scale[0], scale[1], scale[2])),
            roofTransform: Mat4.translation(0,0.5,0),
            wallsTransform: Mat4.identity(),
        }

        
    }

    draw(webgl_manager, uniforms){
        this.shapes.roof.draw(webgl_manager, uniforms, this.transforms.houseTransform.times(this.transforms.roofTransform), this.materials.roofMat);
        this.shapes.walls.draw(webgl_manager,uniforms,this.transforms.houseTransform.times(this.transforms.wallsTransform), this.materials.wallsMat);
    }
}