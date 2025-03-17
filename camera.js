import { tiny, defs } from "./examples/common.js";
const { vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component } = tiny;

export class MoveCamera{
    constructor(main_instance){
      this.main = main_instance;
      this.key_pressed = {};
  
      this.setup_key_listeners();
  
      this.camera_positions = {
        "1": {eye: vec3(0, 18, 20), at: vec3(0, 18, 0), up: vec3(0, 1, 0)},
        "2": {eye: vec3(0, 18, -20), at:vec3(0, 18, 0), up: vec3(0, 1, 0)},
        "3": {eye: vec3(0, 36, 0), at: vec3(0, 18,0), up: vec3(0, 0, -1)},
        "4": {eye: vec3(0, 5, 0), at: vec3(0, 18,0), up: vec3(0, 0, 1)},
        "5": {eye: vec3(-20, 18, 0),at: vec3(0, 18,0),up: vec3(0, 1, 0)},
        "6": {eye: vec3(20, 18, 0), at: vec3(0, 18,0), up:vec3(0, 1, 0)},
        "7": {eye: vec3(15, 8, 20), at: vec3(0, 5, 0), up:vec3(0, 1, 0)},
        "8": {eye: vec3(0, 5, 30), at: vec3(0, 5, 0), up: vec3(0, 1, 0)}
      }
  
      this.eye = this.camera_positions["7"].eye;
      this.at = this.camera_positions["7"].at;
      this.up = this.camera_positions["7"].up;
      
    }
  
    setup_key_listeners(){
      document.addEventListener("keydown", (event)=>{
        const key = event.key;
        if(this.camera_positions[key]){
          this.eye = this.camera_positions[key].eye;
          this.at = this.camera_positions[key].at;
          this.up = this.camera_positions[key].up;
        }
      });
    }
  
    render_animation(caller){
  
      Shader.assign_camera(
        Mat4.look_at(this.eye, this.at, this.up),
        this.main.uniforms
      );
      
    }
  }