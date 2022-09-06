import * as THREE from 'three';
import * as ORE from 'ore-three';
import { Logo } from './Logo';
import { CameraController } from './CameraController';
import { IntroGrid } from './IntroGrid';
import { IntroText } from './IntroText';
import EventEmitter from 'wolfy87-eventemitter';

export class Intro extends EventEmitter {

	private commonUniforms: ORE.Uniforms;

	private animator: ORE.Animator;

	private renderer: THREE.WebGLRenderer;
	public scene: THREE.Scene;
	public camera: THREE.PerspectiveCamera;
	private cameraController: CameraController;

	public renderTarget: THREE.WebGLRenderTarget;

	private logo: Logo;
	private text1: IntroText;
	private text2: IntroText;
	private text3: IntroText;

	public paused: boolean = false;

	constructor( renderer: THREE.WebGLRenderer, introObj: THREE.Object3D, parentUniforms: ORE.Uniforms ) {

		super();

		this.renderer = renderer;

		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color( "#000" );

		this.camera = new THREE.PerspectiveCamera( 38, 16 / 9, 0.01, 1000, );
		this.camera.position.set( 0, 0, 10 );
		this.scene.add( this.camera );

		this.renderTarget = new THREE.WebGLRenderTarget( 1, 1 );

		this.scene.add( introObj );

		this.commonUniforms = ORE.UniformsLib.mergeUniforms( parentUniforms, {
		} );

		this.animator = window.gManager.animator;

		this.commonUniforms.loaded = this.animator.add( {
			name: 'loaded',
			initValue: 0,
			userData: {
				pane: {
					min: 0,
					max: 1
				}
			}
		} );

		/*-------------------------------
			Logo
		-------------------------------*/

		this.logo = new Logo( this.scene.getObjectByName( 'Logo' ) as THREE.Mesh, this.commonUniforms );
		// this.scene.add( this.logo );

		/*-------------------------------
			Text1
		-------------------------------*/

		this.text1 = new IntroText( this.scene.getObjectByName( 'Text1' ) as THREE.Object3D, this.commonUniforms, 'アイデアとテクノロジーで、世界をもっとワクワクさせ、ハッピーにしたい。' );
		this.text2 = new IntroText( this.scene.getObjectByName( 'Text2' ) as THREE.Object3D, this.commonUniforms, 'そして、理想を現実に。そんな想いを込めて、みんなで力を合わせています。' );
		this.text3 = new IntroText( this.scene.getObjectByName( 'Text3' ) as THREE.Object3D, this.commonUniforms, 'Junniの哲学を見てみませんか？' );

		/*-------------------------------
			Scene
		-------------------------------*/

		let light = new THREE.DirectionalLight();
		light.position.set( 1, 1, - 0.0 );
		light.intensity = 0.5;
		this.scene.add( light );

		let aLight = new THREE.AmbientLight();
		aLight.intensity = 0.05;
		this.scene.add( aLight );

		let introGrid = new IntroGrid( this.commonUniforms );
		introGrid.position.z = - 1.0;
		this.scene.add( introGrid );

		/*-------------------------------
			CameraController
		-------------------------------*/

		this.cameraController = new CameraController( this.camera );

	}

	public hover( args: ORE.TouchEventArgs ) {

		this.cameraController.updateCursor( args.screenPosition );

	}

	public update( deltaTime: number ) {

		if ( this.paused ) return;

		this.logo.update( deltaTime );

		this.cameraController.update( deltaTime );

		let rt = this.renderer.getRenderTarget();
		this.renderer.setRenderTarget( this.renderTarget );
		this.renderer.render( this.scene, this.camera );
		this.renderer.setRenderTarget( rt );

	}

	public async updateLoadState( percentage: number ) {

		this.animator.animate( 'loaded', percentage, 0.5, async () => {

			if ( percentage == 1.0 ) {

				await this.logo.start();
				await this.text1.start();
				await this.text2.start();
				await this.text3.start();

				this.emitEvent( 'finishIntro' );

			}

		} );

	}

	public resize( info: ORE.LayerInfo ) {

		this.renderTarget.setSize( info.size.canvasPixelSize.x, info.size.canvasPixelSize.y );

		this.camera.aspect = info.size.canvasAspectRatio;
		this.camera.updateProjectionMatrix();

	}

}
