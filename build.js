import { HermiteSpline, Curve_Shape } from "./spline.js";
import { tiny, defs } from "./examples/common.js";
const { vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component } = tiny;

import { Node } from "./mini_figure.js";
import { getRandomInt, getRandomFloat} from "./utils.js";

export class NodeAnimated extends Node{
    constructor(name, shape, transform, material){
        super(name, shape, transform, material);
        this.end_transform_matrix = transform;
        this.start_transform_matrix = transform;

        //this.dimensions = shape.getDimensions();
    }

    undoHelper(M){
        const origin = vec4(0,0,0,1);
        const position = M.times(origin); 

        const x = position[0];
        const y = position[1];
        const z = position[2];

        const undo = Mat4.translation(-x, -y, -z);
        M = undo.times(M);
        return M;
    }
    
    setStartPos(newPos){
        let M = this.start_transform_matrix;
        M = this.undoHelper(M);

        this.start_transform_matrix = M.pre_multiply(Mat4.translation(newPos[0], newPos[1], newPos[2]));
    }

    setCurrentPos(newPos){
        let M = this.start_transform_matrix;
        M = this.undoHelper(M);

        this.transform_matrix = M.pre_multiply(Mat4.translation(newPos[0], newPos[1], newPos[2]));
    }

    getTransformedBoundingBox() {
        // Ensure the shape is loaded and has a bounding box.
        if (!this.shape.ready) {
          console.warn("Shape not loaded yet.");
          return null;
        }
        
        // Get the original bounding box (local space)
        const min = this.shape.min; // e.g. [minX, minY, minZ]
        const max = this.shape.max; // e.g. [maxX, maxY, maxZ]
      
        // Create the 8 corners of the bounding box.
        const corners = [
          vec3(min[0], min[1], min[2]),
          vec3(min[0], min[1], max[2]),
          vec3(min[0], max[1], min[2]),
          vec3(min[0], max[1], max[2]),
          vec3(max[0], min[1], min[2]),
          vec3(max[0], min[1], max[2]),
          vec3(max[0], max[1], min[2]),
          vec3(max[0], max[1], max[2])
        ];
      
        // Transform each corner by the current transform matrix.
        // (Assuming this.transform_matrix is the one you use to draw the object.)
        let newMin = [Infinity, Infinity, Infinity];
        let newMax = [-Infinity, -Infinity, -Infinity];
      
        for (const corner of corners) {
          // Convert to homogeneous coordinates.
          const transformed = this.transform_matrix.times(vec4(corner[0], corner[1], corner[2], 1));
          // Update newMin and newMax.
          newMin[0] = Math.min(newMin[0], transformed[0]);
          newMin[1] = Math.min(newMin[1], transformed[1]);
          newMin[2] = Math.min(newMin[2], transformed[2]);
      
          newMax[0] = Math.max(newMax[0], transformed[0]);
          newMax[1] = Math.max(newMax[1], transformed[1]);
          newMax[2] = Math.max(newMax[2], transformed[2]);
        }
      
        return {
          min: newMin,
          max: newMax,
          width: newMax[0] - newMin[0],
          height: newMax[1] - newMin[1],
          depth: newMax[2] - newMin[2]
        };
      }
      
}

export class BuildableLego{
    constructor(){
        //holds all the pieces, the order of this list is the order that they will be built in the animation
        this.nodes = [];

        // Prepare for asynchronous loading:
        this.ready = false;
        this.readyCallbacks = [];
    }

    // Register a callback to be called when the car is ready.
    onReady(callback) {
        this.readyCallbacks.push(callback);
        if (this.ready)
        callback();
    }

    // Internal method to mark the Car as ready.
    _setReady() {
        this.ready = true;
        this.readyCallbacks.forEach(cb => cb());
        this.readyCallbacks = [];
    }
    getPieceNodes(){
        return this.nodes;
    }

    draw(caller, uniforms){
        for(let i = 0; i<this.nodes.length; i++){
            const node = this.nodes[i];
            node.shape.draw(caller, uniforms, node.transform_matrix, node.material);
        }
    }
}


export class AnimateBuild{
    constructor(shape, startPosBoundary){
        this.shape = shape;

        this.splines = [];

        this.startTimes = [];
        //this.decayStartTimes = [];

        //total amount of time it takes to build the object
        this.totalBuildTime = 1.5;

        this.buildFractions = []; //this holds the t values for each piece on their respective splines
        this.buildRate = 2.5; // this will adjust the build speed of each piece

        //state variables
        this.UNBUILT = 0; 
        this.BUILDING = 1;
        this.HOPPING = 2;
        this.BUILT = 3;
        
        //starts not built
        this.buildState = this.UNBUILT;        

        this.candidateBoxes = [];
        this.startPosBoundaries = startPosBoundary; // array or vec4 structured as [minX, maxX, minZ, maxZ]

        this.generatePath();
        this.global_t = 0;

        this.hopDuration = 0.2;
        this.hopStartTime = null;
        this.hopHeight = 0.25;

    }

    handleBuildState(buildRequest, minifigPos){
        const isInside = this.checkWithinBounds(minifigPos);
        switch(this.buildState){
            case this.UNBUILT:
                if(isInside && buildRequest){
                    this.buildState = this.BUILDING;
                    this.createStartTimes();
                }
                break;
            case this.BUILDING:
                if(!isInside || !buildRequest){
                    this.buildState = this.UNBUILT;
                    //this.createDecayTimes(); (don't need this anymore but I dont wannt remove the function cuz it took a while to figure out)
                }
                if(this.allPiecesFullyBuilt()){
                    this.buildState = this.HOPPING;
                }
                break;
            case this.HOPPING:
                if(this.hopStartTime === null){
                    this.hopStartTime = this.global_t;
                    this.triggerHop();
                }
            case this.BUILT:
                //Needs to stay built
                break;

        }
    }

    checkWithinBounds(position){
        //extract values from position input
        const x = position[0];
        const y = position[1];
        const z = position[2];

        //extract values from boundary
        const minX = this.startPosBoundaries[0];
        const maxX = this.startPosBoundaries[1];
        const minZ = this.startPosBoundaries[2];
        const maxZ = this.startPosBoundaries[3];

        if(minX <= x && x <= maxX && minZ <= z && z <= maxZ){
            return true;
        }else{
            return false;
        }
    }

    allPiecesFullyBuilt(){
        return this.buildFractions.every(f => f >= 1.0);
    }

    allPiecesFullyUnbuilt(){
        return this.buildFractions.every(f => f<= 0.0);
    }

    getStartPosBoundaries(){
        return this.startPosBoundaries;
    }

    generateStartPosition(existingCandidates, candidateDims, minBuffer = 0, maxAttempts = 100) {
        const minX = this.startPosBoundaries[0];
        const maxX = this.startPosBoundaries[1];
        const minZ = this.startPosBoundaries[2];
        const maxZ = this.startPosBoundaries[3];
        
        // Helper function: check for overlap in X and Z.
        function boxesOverlap(box1, box2) {
          return !(box1.max[0] < box2.min[0] || box1.min[0] > box2.max[0] ||
                   box1.max[2] < box2.min[2] || box1.min[2] > box2.max[2]);
        }
        
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          const x = getRandomFloat(minX, maxX);
          const y = 1; // fixed Y value.
          const z = getRandomFloat(minZ, maxZ);
          const candidate = vec3(x, y, z);
          
          // Compute candidate's bounding box in world space for X and Z.
          // candidateDims should be an object with properties: { min, max, width, height, depth }
          const candidateBox = {
            min: [
              candidate[0] + candidateDims.min[0] - minBuffer,
              candidate[1] + candidateDims.min[1],
              candidate[2] + candidateDims.min[2] - minBuffer
            ],
            max: [
              candidate[0] + candidateDims.max[0] + minBuffer,
              candidate[1] + candidateDims.max[1],
              candidate[2] + candidateDims.max[2] + minBuffer
            ]
          };
          
          let valid = true;
          for (const existing of existingCandidates) {
            if (boxesOverlap(candidateBox, existing.box)) {
              valid = false;
              break;
            }
          }
          if (valid) {
            existingCandidates.push({ pos: candidate, box: candidateBox });
            return candidate;
          }
        }
        
        console.warn("Could not find a non-overlapping candidate after many attempts!");
        // Fallback: return center of boundary.
        const fallback = vec3((minX + maxX) / 2, 1, (minZ + maxZ) / 2);
        const fallbackBox = {
          min: [
            fallback[0] + candidateDims.min[0] - minBuffer,
            fallback[1] + candidateDims.min[1],
            fallback[2] + candidateDims.min[2] - minBuffer
          ],
          max: [
            fallback[0] + candidateDims.max[0] + minBuffer,
            fallback[1] + candidateDims.max[1],
            fallback[2] + candidateDims.max[2] + minBuffer
          ]
        };
        existingCandidates.push({ pos: fallback, box: fallbackBox });
        return fallback;
    }
      
    generatePath(){
        //this.allStartPositions = [];
        this.candidateBoxes = [];
        for(let i = 0; i<this.shape.nodes.length; i++){
            let node = this.shape.nodes[i];

            this.splines[i] = new HermiteSpline();

            const M = node.end_transform_matrix;
            const origin = vec4(0,0,0,1);
            const position = M.times(origin); 

            const x = position[0];
            const y = position[1];
            const z = position[2];

            const endPos = vec3(x, y, z);

            // Get the dimensions from the shape.
            const dims = node.shape.getDimensions();

            const startPos = this.generateStartPosition(this.candidateBoxes, dims, 2, 100);
            //const startPos = this.generateStartPosition(this.allStartPositions, 10, 100);
            node.setStartPos(startPos);

            //Add Starting and End point to the spline:
            let midpoint = vec3(0,0,0);
            for(let i = 0; i<startPos.length; i++){
                midpoint[i] = (startPos[i] + endPos[i])/2;
            }
            let variedIndex = getRandomInt(0, 2);
            //try to make the last nodes use a Y-spline, makes it look like they are stacking at the end
            if(this.shape.nodes.length - i < 0.2 * this.shape.nodes.length){
                variedIndex = 1;
            }
           
            midpoint[variedIndex]  = Math.min(startPos[variedIndex], endPos[variedIndex]) - 20; //make it curve sort of upwards/sideways in random direction
            let bendFactor = 4.5; //increasing will make the "bend" steeper or more drastic
            if(variedIndex == 1){
                bendFactor = 1.5 * bendFactor;
            }
            
            // Clamp the midpoint's y-coordinate so it does not go below a certain threshold:
            const minYThreshold = 0; // set the minimum allowed y value
            if(midpoint[1] < minYThreshold){
                midpoint[1] = minYThreshold;
            }

            let startTan = midpoint.minus(startPos);
            let endTan = midpoint.minus(endPos);
            startTan = startTan.times(bendFactor);
            endTan = endTan.times(bendFactor);

            this.splines[i].add_point(startPos[0], startPos[1], startPos[2], startTan[0], startTan[1], startTan[2]);
            //this.splines[i].add_point(midpoint[0], midpoint[1], midpoint[2], midpoint[0] -1, midpoint[1] + 1, midpoint[2] -1);
            this.splines[i].add_point(endPos[0], endPos[1], endPos[2], endTan[0], endTan[1], endTan[2]);
            
            //initialize buildFractions for this piece to 0.0, implying unbuilt
            this.buildFractions[i] = 0.0;
        }       
    }

    getPieceTransform(index){
        const t = this.buildFractions[index];

        const pathPoint = this.splines[index].get_position(t);

        let node = this.shape.nodes[index];
        node.setCurrentPos(pathPoint);

        return node.transform_matrix;
    }

    createStartTimes(){
        this.animationStartTime = this.global_t;
        const numNodes = this.shape.nodes.length;

        //these two must add up to 1
        const totalSpacingRatio = 0.7;    // last piece starts at 30% of total time
        //const pieceDurationRatio = 0.3;   // each piece takes 70% of total time to finish
        
        this.totalSpacing = totalSpacingRatio * this.totalBuildTime;
        //this.pieceDuration = pieceDurationRatio * this.totalBuildTime;

        for(let i = 0; i<numNodes; i++){
            const fraction = (i / (numNodes - 1)); // from 0..1
            this.startTimes[i] = this.animationStartTime + fraction * this.totalSpacing;
        }
    }

    //this function no longer in use, but I don't wanna delete it >:(
    createDecayTimes(){
        this.animationDecayStartTime = this.global_t;
        const numNodes = this.shape.nodes.length;

        for(let i =0; i<numNodes; i++){
            const fraction = ((numNodes - 1 - i)/(numNodes -1));
            this.decayStartTimes[i] = this.animationDecayStartTime + fraction * this.totalSpacing;
        }
    }

    updateBuildFractions(dt){
        const numPieces = this.shape.nodes.length;

        if(this.buildState===this.BUILDING){
            //When needs to build, should progress up towards 1.0
            for(let i = 0; i<numPieces; i++){
                if(this.global_t>=this.startTimes[i]){
                    const current = this.buildFractions[i];
                    const next = current + dt * this.buildRate;
                    this.buildFractions[i] = Math.min(next, 1.0);
                }
                
            }
        }else if (this.buildState===this.UNBUILT){
            //for UNBUILT should decay down 
            for(let i = 0; i<numPieces; i++){
                const current = this.buildFractions[i];
                const next = current - dt * this.buildRate;
                this.buildFractions[i] = Math.max(next, 0.0);
                //OPTIONALLY, can add an if(this.global_t>=this.decayStartTimes[i]) check if pieces should decay relative to their start times, however in practice it doesnt look as good.
            }
        }
    }

    updateState(uniforms, minifigRequest, minifigPos){
        //moved this in here to reduce functions needed to be called outside of this class
        this.handleBuildState(minifigRequest, minifigPos);
        
        const t_now = uniforms.animation_time / 1000;
        //get time difference between each render
        const dt = Math.max(t_now - this.global_t, 0.0); // so it doesn't go below 0 by some weird bug or something
        this.global_t = t_now;

        this.updateBuildFractions(dt);
    }

    triggerHop(){
        this.hopStartTime = this.global_t;
    }

    drawHopAnimation(caller, uniforms){
        if(this.hopStartTime === null){
            //hop start time needs to be initialized first
            return;
        }
        // Compute elapsed time (in seconds).
        const t_now = uniforms.animation_time / 1000;
        let dt = (t_now - this.hopStartTime) / this.hopDuration;
        this.global_t = t_now;
        
        // Clamp t between 0 and 1.
        if(dt > 1) dt = 1;

        const numPieces = this.shape.nodes.length;
        const offset = this.hopHeight * Math.sin((Math.PI * 2) * dt);
        for(let i = 0; i<numPieces; i++){
            let node = this.shape.nodes[i];
            node.transform_matrix = node.transform_matrix.pre_multiply(Mat4.translation(0, offset, 0));
            node.shape.draw(caller, uniforms, node.transform_matrix, node.material);
        }

        if(dt===1){
            this.hopStartTime = null;
            this.buildState = this.BUILT;
        }
    }

    drawFullObject(caller, uniforms){
        this.shape.draw(caller, uniforms);
    }

    drawByPiece(caller, uniforms){  
        for(let i = 0; i<this.shape.nodes.length; i++){
            let node = this.shape.nodes[i];
            const nodeTransform = this.getPieceTransform(i);
            node.shape.draw(caller, uniforms, nodeTransform, node.material);
            //this.curve.draw(caller, uniforms);
        }
        if(this.allPiecesFullyBuilt()){
            //sthis.buildState = this.BUILT;
            this.triggerHop(uniforms);
        }
        if(this.allPiecesFullyUnbuilt()){
            this.buildState = this.UNBUILT;
        }
    }

    //this is what should be called to draw
    draw(caller, uniforms, minifigRequest, minifigPos){
        this.updateState(uniforms, minifigRequest, minifigPos);
        
        if(this.buildState === this.UNBUILT || this.buildState === this.BUILDING){
            this.drawByPiece(caller, uniforms);
        }
        else if(this.buildState === this.HOPPING){
            this.drawHopAnimation(caller, uniforms);
        }
        else if(this.buildState === this.BUILT){
            this.drawFullObject(caller, uniforms);
        }
    }

}