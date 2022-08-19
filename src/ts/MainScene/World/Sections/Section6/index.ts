import * as THREE from 'three';
import * as ORE from 'ore-three';

import { Section } from '../Section';
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader';
import { Objects } from './Objects';
import { Comrades } from './Comrades';
import { Wind } from './Wind';

export class Section6 extends Section {

	private objects?: Objects;
	private comrades?: Comrades;

	constructor( manager: THREE.LoadingManager, parentUniforms: ORE.Uniforms ) {

		super( manager, 'section_6', parentUniforms );

		this.bakuMaterialType = 'normal';
		this.ppParam.bloomBrightness = 1.0;

		// this.ppParam.bloomBrightness = 0.0;

	}

	protected onLoadedGLTF( gltf: GLTF ): void {

		let scene = gltf.scene;

		this.add( scene );

		/*-------------------------------
			light
		-------------------------------*/

		let light = new THREE.DirectionalLight();
		light.position.set( - 10, 1, 0 );
		this.add( light );

		/*-------------------------------
			Comrades
		-------------------------------*/

		this.comrades = new Comrades( this.getObjectByName( 'Comrades' ) as THREE.Object3D, this.getObjectByName( "Comrades_Origin_Wrap" ) as THREE.SkinnedMesh, gltf.animations, this.commonUniforms );

		/*-------------------------------
			Wind
		-------------------------------*/

		let wind = new Wind( this.commonUniforms );
		wind.quaternion.copy( ( this.getObjectByName( 'Baku' ) as THREE.Object3D ).quaternion );
		wind.frustumCulled = false;
		wind.position.copy( ( this.getObjectByName( 'Baku' ) as THREE.Object3D ).position );

		wind.rotateY( Math.PI / 2 );

		this.add( wind );

	}

	public update( deltaTime: number ): void {

		this.bakuTransform.rotation.multiply( new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3( 0.0, 0.0, 1.0 ), deltaTime * 0.5 ) );

		if ( this.comrades ) {

			this.comrades.update( deltaTime );

		}

	}

}
