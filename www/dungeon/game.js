import * as THREE from '../libs/three.module.js';
import { GLTFLoader } from '../libs/GLTFLoader.js';
import { RGBELoader } from '../libs/RGBELoader.js';
import { Player } from '../libs/Player.js';
import { LoadingBar } from '../libs/LoadingBar.js';
import { Pathfinding } from '../libs/three-pathfinding.module.js';
import * as dat from '../libs/dat.gui.module.js';

const assetsPath = '../assets/';

class Game{
	constructor(){		
		const container = document.createElement( 'div' );
		document.body.appendChild( container );

		
		this.camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 3000 );
		this.camera.position.set( 0, 32, 28 );

		this.scene = new THREE.Scene();

		const ambient = new THREE.HemisphereLight(0x555555, 0x999999);
		this.scene.add(ambient);
		
		this.sun = new THREE.DirectionalLight( 0xAAAAFF, 3.5 );
		this.sun.castShadow = true;

		const lightSize = 5;
        this.sun.shadow.camera.near = 0.1;
        this.sun.shadow.camera.far = 17;
		this.sun.shadow.camera.left = this.sun.shadow.camera.bottom = -lightSize;
		this.sun.shadow.camera.right = this.sun.shadow.camera.top = lightSize;

        //this.sun.shadow.bias = 0.0039;
        this.sun.shadow.mapSize.width = 1024;
        this.sun.shadow.mapSize.height = 1024;
        
		this.sun.position.set( 0, 10, 10 );
		this.scene.add( this.sun );
		
		this.debug = { showShadowHelper:false, showPath:true, offset: 0.2 };
		//Create a helper for the shadow camera
		this.helper = new THREE.CameraHelper( this.sun.shadow.camera );
		this.helper.visible = this.debug.showShadowHelper;
		this.scene.add( this.helper );
			
		this.renderer = new THREE.WebGLRenderer();
		this.renderer.setPixelRatio( window.devicePixelRatio );
		this.renderer.setSize( window.innerWidth, window.innerHeight );
		this.renderer.shadowMap.enabled = true;
		container.appendChild( this.renderer.domElement );
		this.setSceneEnvironment();
		
		this.waypoints = [ 
			new THREE.Vector3(-15.5, 5.26, 15.68),
			new THREE.Vector3(13.4, 5.51, 15.74),
			new THREE.Vector3(13.6, 5.48, -7.96),
			new THREE.Vector3(-15.4, 5.17, -9.03),
			new THREE.Vector3(-8.2, 0.25, 8.55),
			new THREE.Vector3(7.5, 0.18, 8.50),
			new THREE.Vector3(-22.2, 5.37, -0.15)
		];

		this.clock = new THREE.Clock();
		
		this.loadingBar = new LoadingBar();
		
		this.loadEnvironment();
		
		const raycaster = new THREE.Raycaster();
    	this.renderer.domElement.addEventListener( 'click', raycast, false );
			
    	this.loading = true;
    	
    	const self = this;
    	const mouse = { x:0, y:0 };
    	
    	function raycast(e){
    		if (self.loading) return;
    		
			mouse.x = ( e.clientX / window.innerWidth ) * 2 - 1;
			mouse.y = - ( e.clientY / window.innerHeight ) * 2 + 1;

			//2. set the picking ray from the camera position and mouse coordinates
			raycaster.setFromCamera( mouse, self.camera );    

			//3. compute intersections
			const intersects = raycaster.intersectObject( self.navmesh );
			
			if (intersects.length>0){
				const pt = intersects[0].point;
				
				// Teleport on ctrl/cmd click or RMB.
				if (e.metaKey || e.ctrlKey || e.button === 2) {
					const player = self.fred.object;
					player.position.copy(pt);
					self.fred.navMeshGroup = self.pathfinder.getGroup(self.ZONE, player.position);
					const closestNode = self.pathfinder.getClosestNode(player.position, self.ZONE, self.fred.navMeshGroup);
					if (self.pathLines) self.scene.remove(self.pathLines);
					if (self.calculatedPath) self.calculatedPath.length = 0;
					self.fred.action = 'idle';
					return;
				}
				
				self.fred.newPath(pt, true);
			}	
		}
		
		window.addEventListener('resize', function(){ 
			self.camera.aspect = window.innerWidth / window.innerHeight;
    		self.camera.updateProjectionMatrix();

    		self.renderer.setSize( window.innerWidth, window.innerHeight );  
    	});
	}
	
	setSceneEnvironment(){
        const loader = new RGBELoader().setDataType( THREE.UnsignedByteType );
        const pmremGenerator = new THREE.PMREMGenerator( this.renderer );
        pmremGenerator.compileEquirectangularShader();
        
        const self = this;
        
        loader.load( `${assetsPath}venice_sunset_1k.hdr`, ( texture ) => {
          const envMap = pmremGenerator.fromEquirectangular( texture ).texture;
          pmremGenerator.dispose();

          self.scene.environment = envMap;

        }, undefined, (err)=>{
            console.error( 'An error occurred setting the environment');
        } );
    }
    
	loadEnvironment(){
		const loader = new GLTFLoader();
		const self = this;
		
		// Load a glTF resource
		loader.load(
			// resource URL
			`${assetsPath}dungeon.glb`,
			// called when the resource is loaded
			function ( gltf ) {

				self.scene.add( gltf.scene );
				
				gltf.scene.traverse(function (child) {
    				if (child.isMesh){
						if (child.name=="Navmesh"){
							child.material.visible = false;
							self.navmesh = child;
						}else{
							child.castShadow = false;
							child.receiveShadow = true;
						}
					}
				});
			
				self.pathfinder = new Pathfinding();
				self.ZONE = 'dungeon';
				self.pathfinder.setZoneData(self.ZONE, Pathfinding.createZone(self.navmesh.geometry));

				self.loadFred();
			},
			// called while loading is progressing
			function ( xhr ) {

				self.loadingBar.progress = (xhr.loaded / xhr.total) * 0.33 + 0.0;
				
			},
			// called when loading has errors
			function ( error ) {

				console.error( error.message );

			}
		);
	}
	
	loadFred(){
		const loader = new GLTFLoader();
		const self = this;
		
		const anims = [
					{start:30, end:59, name:"backpedal", loop:true},
					{start:90, end:129, name:"bite", loop:false},
					{start:164, end:193, name:"crawl", loop:true},
					{start:225, end:251, name:"die", loop:false},
					{start:255, end:294, name:"hitBehind", loop:false},
					{start:300, end:344, name:"hitFront", loop:false},
					{start:350, end:384, name:"hitLeft", loop:false},
					{start:390, end:424, name:"hitRight", loop:false},
					{start:489, end:548, name:"idle", loop:true},
					{start:610, end:659, name:"jump", loop:false},
					{start:665, end:739, name:"roar", loop:false},
					{start:768, end:791, name:"run", loop:true},
					{start:839, end:858, name:"shuffleLeft", loop:true},
					{start:899, end:918, name:"shuffleRight", loop:true},
					{start:940, end:979, name:"spawn", loop:false},
					{start:1014, end:1043, name:"strafeRight", loop:true},
					{start:1104, end:1133, name:"strafeRight", loop:true},
					{start:1165, end:1229, name:"swipe", loop:false},
					{start:1264, end:1293, name:"walk", loop:true}
				];
		
		// Load a GLTF resource
		loader.load(
			// resource URL
			`${assetsPath}fred.glb`,
			// called when the resource is loaded
			function ( gltf ) {
				const object = gltf.scene.children[0];
				
				object.traverse(function(child){
					if (child.isMesh){
						child.castShadow = true;
					}
				});
				self.sun.target = object;
				
				const options = {
					object: object,
					speed: 5,
					assetsPath: assetsPath,
					loader: loader,
					anims: anims,
					clip: gltf.animations[0],
					app: self,
					name: 'fred',
					npc: false
				};
				
				self.fred = new Player(options);
				
				self.loading = false;
				//self.fred.object.children[3].material.visible = false;
				self.fred.action = 'idle';
				const scale = 0.015;
				self.fred.object.scale.set(scale, scale, scale);
				self.fred.object.position.set(-1, 0, 2); 
				
				const wide = new THREE.Object3D();
				wide.position.copy(self.camera.position);
				wide.target = new THREE.Vector3(0,0,0);
				const rear = new THREE.Object3D()
				rear.position.set(0, 500, -500);
				rear.target = self.fred.object.position;
				self.fred.object.add(rear);
				const front = new THREE.Object3D()
				front.position.set(0, 500, 500);
				front.target = self.fred.object.position;
				self.fred.object.add(front);
				self.cameras = { wide, rear, front };
				self.activeCamera = wide;
				
				const gui = new dat.GUI();
				gui.add(self, 'switchCamera');
				gui.add(self, 'showPath');
				gui.add(self, 'showShadowHelper');
				
				self.loadGhoul();

			},
			// called while loading is progressing
			function ( xhr ) {

				self.loadingBar.progress = (xhr.loaded / xhr.total) * 0.33 + 0.33;

			},
			// called when loading has errors
			function ( error ) {

				console.error( error.message );

			}
		);
	}
	
	loadGhoul(){
		const loader = new GLTFLoader();
		const self = this;

		const anims = [
					{start:81, end:161, name:"idle", loop:true},
					{start:250, end:290, name:"block", loop:false},
					{start:300, end:320, name:"gethit", loop:false},
					{start:340, end:375, name:"die", loop:false},
					{start:380, end:430, name:"attack", loop:false},
					{start:470, end:500, name:"walk", loop:true},
					{start:540, end:560, name:"run", loop:true}
				];
		
		// Load a GLTF resource
		loader.load(
			// resource URL
			`${assetsPath}ghoul.glb`,
			// called when the resource is loaded
			function ( gltf ) {
				const gltfs = [gltf];
				for(let i=0; i<3; i++) gltfs.push(self.cloneGLTF(gltf));
				
				self.ghouls = [];
				
				gltfs.forEach(function(gltf){
					const object = gltf.scene.children[0];

					object.traverse(function(child){
						if (child.isMesh){
							child.castShadow = true;
						}
					});

					const options = {
						object: object,
						speed: 4,
						assetsPath: assetsPath,
						loader: loader,
						anims: anims,
						clip: gltf.animations[0],
						app: self,
						name: 'ghoul',
						npc: true
					};

					const ghoul = new Player(options);

					const scale = 0.015;
					ghoul.object.scale.set(scale, scale, scale);

					ghoul.object.position.copy(self.randomWaypoint);
					ghoul.newPath(self.randomWaypoint);
					
					self.ghouls.push(ghoul);
				});
							  
				self.render(); 
				
				self.loadingBar.visible = false;
			},
			// called while loading is progressing
			function ( xhr ) {

				self.loadingBar.progress = (xhr.loaded / xhr.total) * 0.33 + 0.67;

			},
			// called when loading has errors
			function ( error ) {

				console.error( error.message );

			}
		);
	}
		
	cloneGLTF(gltf){
	
		const clone = {
			animations: gltf.animations,
			scene: gltf.scene.clone(true)
		  };
		
		const skinnedMeshes = {};
		
		gltf.scene.traverse(node => {
			if (node.isSkinnedMesh) {
			  skinnedMeshes[node.name] = node;
			}
		});
		
		const cloneBones = {};
		const cloneSkinnedMeshes = {};
		
		clone.scene.traverse(node => {
			if (node.isBone) {
			  cloneBones[node.name] = node;
			}
			if (node.isSkinnedMesh) {
			  cloneSkinnedMeshes[node.name] = node;
			}
		});
		
		for (let name in skinnedMeshes) {
			const skinnedMesh = skinnedMeshes[name];
			const skeleton = skinnedMesh.skeleton;
			const cloneSkinnedMesh = cloneSkinnedMeshes[name];
			const orderedCloneBones = [];
			for (let i = 0; i < skeleton.bones.length; ++i) {
				const cloneBone = cloneBones[skeleton.bones[i].name];
				orderedCloneBones.push(cloneBone);
			}
			cloneSkinnedMesh.bind(
				new THREE.Skeleton(orderedCloneBones, skeleton.boneInverses),
				cloneSkinnedMesh.matrixWorld);
		}
		
		return clone;

	}
	
	get randomWaypoint(){
		const index = Math.floor(Math.random()*this.waypoints.length);
		return this.waypoints[index];
	}
	
	set showPath(value){
		if (this.fred.pathLines) this.fred.pathLines.visible = value;
		this.debug.showPath = value;
	}
	
	get showPath(){
		return this.debug.showPath;
	}
	
	set showShadowHelper(value){
		if (this.helper) this.helper.visible = value;
		this.debug.showShadowHelper = value;
	}
	
	get showShadowHelper(){
		return this.debug.showShadowHelper;
	}
	
	switchCamera(){
		if (this.activeCamera==this.cameras.wide){
			this.activeCamera = this.cameras.rear;
		}else if (this.activeCamera==this.cameras.rear){
			this.activeCamera = this.cameras.front;
		}else if (this.activeCamera==this.cameras.front){
			this.activeCamera = this.cameras.wide;
		}
	}
		
	render(){
		const dt = this.clock.getDelta();
		const self = this;
		requestAnimationFrame(function(){ self.render(); });
		
		this.sun.position.copy(this.fred.object.position);
		this.sun.position.y += 10;
		this.sun.position.z += 10;
		
		if (this.activeCamera && this.controls===undefined){
			this.camera.position.lerp(this.activeCamera.getWorldPosition(new THREE.Vector3()), 0.1);
			const pos = this.activeCamera.target.clone();
			pos.y += 1.8;
			this.camera.lookAt(pos);
		}
		
		this.fred.update(dt);
		this.ghouls.forEach( ghoul => { ghoul.update(dt) });
		
		this.renderer.render(this.scene, this.camera);
	}
}

export {Game};