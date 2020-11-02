import * as THREE from './three.module.js';

class Player{
	constructor(options){
		const fps = options.fps || 30; //default fps
		
		this.assetsPath = options.assetsPath;
		this.name = options.name || 'Player';
		
		this.animations = {};	
		
		options.app.scene.add(options.object);
		
		this.object = options.object;
		this.pathLines = new THREE.Object3D();
		this.pathColor = new THREE.Color(0xFFFFFF);
		this.nodeRadius = (options.nodeRadius) ? options.nodeRadius : 0.2;
		
		options.app.scene.add(this.pathLines);
		
		this.npc = options.npc;
        
        if (this.npc) this.dead = false;
		
        this.speed = options.speed;
        this.app = options.app;
        
        if (options.app.pathfinder){
            this.pathfinder = options.app.pathfinder;
            this.ZONE = options.app.ZONE;
            this.navMeshGroup = this.pathfinder.getGroup(this.ZONE, this.object.position);	
        }
		
		const clip = options.clip;
		const self = this;
		
		const pt = this.object.position.clone();
		pt.z += 10;
		this.object.lookAt(pt);
		
        if (options.anims){ 
            //Use this option to crop a single animation into multiple clips
            this.mixer = new THREE.AnimationMixer(options.object);
            options.anims.forEach(function(anim){
                self.animations[anim.name] = THREE.AnimationUtils.subclip(clip, anim.name, anim.start, anim.end);
            });
        }
        
        if (options.animations){
            //Use this option to set multiple animations directly
            this.mixer = new THREE.AnimationMixer(options.object);
            options.animations.forEach( (animation)=>{
                self.animations[animation.name.toLowerCase()] = animation;
            })
        }
	}
	
	newPath(pt){
        const player = this.object;
        
        if (this.pathfinder===undefined){
            this.calculatedPath = [ pt.clone() ];
            this.setTargetDirection();
            return;
        }
        		
		// Calculate a path to the target and store it
		this.calculatedPath = this.pathfinder.findPath(player.position, pt, this.ZONE, this.navMeshGroup);
		
		if (this.calculatedPath && this.calculatedPath.length) {
			this.action = 'walk';
			
			this.setTargetDirection();
			
			if (this.app.debug.showPath && !this.npc){
				this.showPathLines();
			}
		} else {
			this.action = 'idle';
			if (this.pathLines) this.app.scene.remove(this.pathLines);
		}
	}
	
	setTargetDirection(){
		const player = this.object;
		const pt = this.calculatedPath[0].clone();
		pt.y = player.position.y;
		const quaternion = player.quaternion.clone();
		player.lookAt(pt);
		this.quaternion = player.quaternion.clone();
		player.quaternion.copy(quaternion);
	}
	
	showPathLines(){
		if (this.pathLines) this.app.scene.remove(this.pathLines);

		const material = new THREE.LineBasicMaterial({
			color: this.pathColor,
			linewidth: 2
		});

		const player = this.object;
		const self = this;
		
		const geometry = new THREE.Geometry();
		geometry.vertices.push(player.position);

		// Draw debug lines
		this.calculatedPath.forEach( function(vertex){
			geometry.vertices.push(vertex.clone().add(new THREE.Vector3(0, self.app.debug.offset, 0)));
		});

		this.pathLines = new THREE.Line( geometry, material );
		this.app.scene.add( this.pathLines );

		// Draw debug spheres except the last one. Also, add the player position.
		const debugPath = [player.position].concat(this.calculatedPath);
		const geo = new THREE.SphereBufferGeometry( this.nodeRadius );
		const mat = new THREE.MeshBasicMaterial( {color: this.pathColor} );
		const offset = this.app.debug.offset | 0;
		
		debugPath.forEach(function( vertex ){
			const node = new THREE.Mesh( geo, mat );
			node.position.copy(vertex);
			node.position.y += offset;
			self.pathLines.add( node );
		});
	}
	
	set action(name){
		//Make a copy of the clip if this is a remote player
		if (this.actionName == name.toLowerCase()) return;
		
		const clip = this.animations[name.toLowerCase()];
		
        delete this.curAction;
        
		if (clip!==undefined){
			const action = this.mixer.clipAction( clip );
			action.loop = clip.loop;
			action.time = 0;
			this.mixer.stopAllAction();
			this.actionName = name.toLowerCase();
			this.actionTime = Date.now();
			action.fadeIn(0.5);	
			action.play();
            this.curAction = action;
		}
	}
	
	update(dt){
		const speed = this.speed;
		const player = this.object;
		
		if (this.mixer) this.mixer.update(dt);
		
        if (this.calculatedPath && this.calculatedPath.length) {
            const targetPosition = this.calculatedPath[0];

            const vel = targetPosition.clone().sub(player.position);
            
            let pathLegComplete = (vel.lengthSq()<0.01);
            
            if (!pathLegComplete) {
                //Get the distance to the target before moving
                const prevDistanceSq = player.position.distanceToSquared(targetPosition);
                vel.normalize();
                // Move player to target
                if (this.quaternion) player.quaternion.slerp(this.quaternion, 0.1);
                player.position.add(vel.multiplyScalar(dt * speed));
                //Get distance after moving, if greater then we've overshot and this leg is complete
                const newDistanceSq = player.position.distanceToSquared(targetPosition);
                pathLegComplete = (newDistanceSq > prevDistanceSq);
            } 
            
            if (pathLegComplete){
                // Remove node from the path we calculated
                this.calculatedPath.shift();
                if (this.calculatedPath.length==0){
                    if (this.npc){
                        this.newPath(this.app.randomWaypoint);
                    }else{
                        player.position.copy( targetPosition );
                        this.action = 'idle';
                    }
                }else{
                    this.setTargetDirection();
                }
            }
        }else{
            if (this.npc && !this.dead) this.newPath(this.app.randomWaypoint);
        }
    }
}

export { Player };