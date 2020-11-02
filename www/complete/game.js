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
		this.camera.position.set( 0, 5, 3 );
		this.camera.lookAt(0,0,0);

		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color( 0xaaaaff );

		const ambient = new THREE.HemisphereLight(0x555555, 0x999999);
		this.scene.add(ambient);
		
		this.sun = new THREE.DirectionalLight( 0xAAAAFF, 1.0 );
		this.sun.position.set( 0, 1, 0.5);
		this.sun.target.position.set(0,0,0);
		this.sun.castShadow = true;

		const lightSize = 5;
        this.sun.shadow.camera.near = 0.1;
        this.sun.shadow.camera.far = 17;
		this.sun.shadow.camera.left = this.sun.shadow.camera.bottom = -lightSize;
		this.sun.shadow.camera.right = this.sun.shadow.camera.top = lightSize;

        this.sun.shadow.mapSize.width = 1024;
        this.sun.shadow.mapSize.height = 1024;
        
		this.scene.add( this.sun );
			
		this.renderer = new THREE.WebGLRenderer();
		this.renderer.setPixelRatio( window.devicePixelRatio );
		this.renderer.setSize( window.innerWidth, window.innerHeight );
		this.renderer.shadowMap.enabled = true;
		this.renderer.outputEncoding = THREE.sRGBEncoding;
		container.appendChild( this.renderer.domElement );
		this.setSceneEnvironment();

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
				console.log(pt);
				self.ball.newPath(pt, true);
			}	
		}
		
		this.debug = { showPath:true };
		const gui = new dat.GUI();
		gui.add(this, 'showPath');
		
		window.addEventListener('resize', this.resize.bind(this));
	}
	
	createBall(){
		const geometry = new THREE.SphereBufferGeometry(0.1, 12, 8);
		const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
		const mesh = new THREE.Mesh( geometry, material );
			
		mesh.position.set(-0.88, 0.03, -0.38);
		
		const options = {
			object: mesh,
			nodeRadius: 0.05,
			speed: 2,
			app: this,
			name: 'ball'
		};

		return new Player( options );
	}
	
	resize(){
		this.camera.aspect = window.innerWidth / window.innerHeight;
    	this.camera.updateProjectionMatrix();

    	this.renderer.setSize( window.innerWidth, window.innerHeight ); 
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
			`${assetsPath}hextile.glb`,
			// called when the resource is loaded
			function ( gltf ) {

				self.scene.add( gltf.scene );
				
				gltf.scene.traverse(function (child) {
    				if (child.isMesh){
						if (child.name=="navmesh"){
							child.material.transparent = true;
							child.material.opacity = 0.5;
							const mesh = new THREE.Mesh(child.geometry, new THREE.MeshBasicMaterial({ wireframe: true, color: 0x111111}));
							mesh.position.copy(child.position);
							mesh.quaternion.copy(child.quaternion);
							gltf.scene.add(mesh);
							self.navmesh = child;
						}else{
							child.castShadow = false;
							child.receiveShadow = true;
						}
					}
				});
			
				self.pathfinder = new Pathfinding();
				self.ZONE = 'island';
				self.pathfinder.setZoneData(self.ZONE, Pathfinding.createZone(self.navmesh.geometry));

				self.ball = self.createBall();
		
				self.loadingBar.visible = false;
				self.loading = false;
				
				self.render();
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
	
	set showPath(value){
		if (this.ball.pathLines) this.ball.pathLines.visible = value;
		this.debug.showPath = value;
	}
	
	get showPath(){
		return this.debug.showPath;
	}
		
	render(){
		const dt = this.clock.getDelta();
		
		requestAnimationFrame(this.render.bind(this));
		
		this.ball.update(dt);
		
		this.renderer.render(this.scene, this.camera);
	}
}

export {Game};