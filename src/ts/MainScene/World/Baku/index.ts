import * as THREE from 'three';
import * as ORE from 'ore-three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { PowerMesh } from 'power-mesh';

import bakuFrag from './shaders/baku.fs';
import bakuVert from './shaders/baku.vs';
import passThroughFrag from './shaders/passThrough.fs';

export type BakuMaterialType = 'normal' | 'grass' | 'line'

export class Baku extends THREE.Object3D {

	// animation

	private animator: ORE.Animator;
	private animationMixer?: THREE.AnimationMixer;
	private currentAnimationSection: string | null = null;
	private animationClipNameList: string[] = [];
	private animationActions: { [name:string]: THREE.AnimationAction} = {};

	// state

	private jumping: boolean = false;

	private manager: THREE.LoadingManager;
	private commonUniforms: ORE.Uniforms;

	private mesh?: PowerMesh;
	protected meshLine?: THREE.SkinnedMesh<THREE.BufferGeometry, THREE.ShaderMaterial>;

	private passThrough?: ORE.PostProcessing;
	public sceneRenderTarget: THREE.WebGLRenderTarget;
	public onLoaded?: () => void;

	constructor( manager: THREE.LoadingManager, parentUniforms: ORE.Uniforms ) {

		super();

		this.manager = manager;

		this.commonUniforms = ORE.UniformsLib.mergeUniforms( parentUniforms, {
			uSceneTex: {
				value: null
			},
			uNoiseTex: window.gManager.assetManager.getTex( 'noise' ),
			winResolution: {
				value: new THREE.Vector2()
			},
		} );

		/*-------------------------------
			Animator
		-------------------------------*/

		this.animator = window.gManager.animator;

		this.commonUniforms.uTransparent = this.animator.add( {
			name: 'bakuTransparent',
			initValue: 0,
			easing: ORE.Easings.easeOutCubic,
			userData: {
				pane: {
					min: 0, max: 1
				}
			}
		} );

		this.commonUniforms.uLine = this.animator.add( {
			name: 'bakuLine',
			initValue: 0,
			easing: ORE.Easings.easeOutCubic,
			userData: {
				pane: {
					min: 0, max: 1
				}
			}
		} );

		this.animator.add( {
			name: 'bakuRotate',
			initValue: 1,
			easing: ORE.Easings.easeOutCubic
		} );

		/*-------------------------------
			RenderTarget
		-------------------------------*/

		this.sceneRenderTarget = new THREE.WebGLRenderTarget( 1, 1 );

		/*-------------------------------
			Load
		-------------------------------*/

		let loader = new GLTFLoader( this.manager );

		loader.load( './assets/scene/baku.glb', ( gltf ) => {

			let bakuWrap = gltf.scene.getObjectByName( "baku_amature" ) as THREE.Object3D;

			this.add( bakuWrap );

			/*-------------------------------
				MainMesh
			-------------------------------*/

			this.mesh = new PowerMesh( bakuWrap.getObjectByName( 'Baku' ) as THREE.Mesh, {
				fragmentShader: bakuFrag,
				vertexShader: bakuVert,
				uniforms: this.commonUniforms,
			}, true );

			this.mesh.castShadow = true;
			this.mesh.renderOrder = 2;

			this.mesh.onBeforeRender = ( renderer ) => {

				if ( ! this.passThrough ) {

					this.passThrough = new ORE.PostProcessing( renderer, {
						fragmentShader: passThroughFrag,
					} );

				}

				let currentRenderTarget = renderer.getRenderTarget();

				if ( currentRenderTarget ) {

					this.passThrough.render( { tex: currentRenderTarget.texture }, this.sceneRenderTarget );

					this.commonUniforms.uSceneTex.value = this.sceneRenderTarget.texture;

				}

			};

			/*-------------------------------
				Line Mesh
			-------------------------------*/

			const lineMat = new THREE.ShaderMaterial( {
				vertexShader: bakuVert,
				fragmentShader: bakuFrag,
				uniforms: ORE.UniformsLib.mergeUniforms( this.commonUniforms, {
				} ),
				side: THREE.BackSide,
				depthWrite: false,
				transparent: true,
				defines: {
					IS_LINE: ''
				},
			} );

			this.meshLine = new THREE.SkinnedMesh( this.mesh.geometry, lineMat );
			this.meshLine.skeleton = this.mesh.skeleton;
			// this.add( this.meshLine );

			/*-------------------------------
				animation
			-------------------------------*/

			this.animationMixer = new THREE.AnimationMixer( this );
			this.animations = gltf.animations;

			for ( let i = 0; i < this.animations.length; i ++ ) {

				let clip = this.animations[ i ];

				this.animator.add( {
					name: "BakuWeight/" + clip.name,
					initValue: 1,
					userData: {
						pane: {
							min: 0,
							max: 1
						}
					},
					easing: ORE.Easings.easeOutCubic
				} );

				this.animationClipNameList.push( clip.name );

				let action = this.animationMixer.clipAction( this.animations[ i ] );
				this.animationActions[ clip.name ] = action;

			}

			if ( this.currentAnimationSection ) {

				this.changeSectionAction( this.currentAnimationSection );

			}

			if ( this.onLoaded ) {

				this.onLoaded();

			}

		} );

	}

	public changeMaterial( type: BakuMaterialType ) {

		this.animator.animate( 'bakuTransparent', type == 'grass' ? 1 : 0, 1 );
		this.animator.animate( 'bakuLine', type == 'line' ? 1 : 0, 1 );

	}

	private playingSectionAction: THREE.AnimationAction | null = null;

	public changeSectionAction( sectionName: string ) {

		let action = this.animationActions[ sectionName ];
		let lastSectionAction = this.playingSectionAction;
		this.playingSectionAction = action;

		if ( action ) {

			action.play();

		}

		for ( let i = 0; i < this.animationClipNameList.length; i ++ ) {

			let name = this.animationClipNameList[ i ];
			this.animator.animate( 'BakuWeight/' + name, name == sectionName ? 1 : 0, 1.0, () =>{

				if ( lastSectionAction && lastSectionAction.getClip().name == name ) {

					lastSectionAction.stop();

				}

			} );

		}

		this.currentAnimationSection = sectionName;

	}

	public update( deltaTime: number ) {

		if ( this.animationMixer ) {

			this.animationMixer.update( deltaTime );

			for ( let i = 0; i < this.animationClipNameList.length; i ++ ) {

				let name = this.animationClipNameList[ i ];

				let action = this.animationActions[ name ];

				if ( action ) {

					action.weight = this.animator.get( 'BakuWeight/' + name ) || 0;

				}

				if ( name == 'section_3' ) {

					// 無理やりループ
					if ( action.time > 3.33333333333 ) {

						action.time = 0;

					}

				}

			}

		}

		if ( this.mesh ) {

			this.rotation.z -= ( this.animator.get<number>( 'bakuRotate' ) || 0 ) * 6.0;

		}

	}

	public jump() {

		if ( this.jumping ) return;

		this.jumping = true;

		let action = this.animationActions[ "section_4_jump" ];
		action.reset();
		action.loop = THREE.LoopOnce;
		action.play();

		this.animator.setValue( 'BakuWeight/section_4_jump', 1 );

		if ( this.animationMixer ) {

			let onFinished = ( e: any ) => {

				let action = e.action as THREE.AnimationAction;
				let clip = action.getClip();

				if ( clip.name == 'section_4_jump' ) {

					this.animator.animate( 'BakuWeight/section_4_jump', 0, 0.5 );

					this.jumping = false;

					if ( this.animationMixer ) {

						this.animationMixer.addEventListener( 'finished', onFinished );

					}

				}

			};

			this.animationMixer.addEventListener( 'finished', onFinished );

		}

		this.dispatchEvent( {
			type: 'jump'
		} );

	}

	public show( duration: number = 1.0 ) {

		this.animator.animate( 'bakuRotate', 0, duration );

	}

	public resize( info: ORE.LayerInfo ) {

		this.sceneRenderTarget.setSize( info.size.canvasPixelSize.x, info.size.canvasPixelSize.y );
		this.commonUniforms.winResolution.value.copy( info.size.canvasPixelSize );

	}

}
