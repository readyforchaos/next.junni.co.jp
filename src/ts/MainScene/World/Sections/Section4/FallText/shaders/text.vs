attribute vec4 tangent;

uniform float uVisibility;
uniform float uPartVisibility;
uniform float uSwap;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewNormal;
varying vec3 vViewPos;
varying vec3 vWorldPos;
varying vec2 vHighPrecisionZW;

/*-------------------------------
	ShadowMap
-------------------------------*/

#include <shadowmap_pars_vertex>

#pragma glslify: import('./constants.glsl' )
#pragma glslify: rotate = require('./rotate.glsl' )

void main( void ) {

	/*-------------------------------
		Position
	-------------------------------*/

	vec3 pos = position;

	#ifdef LINE

		pos += normal * 0.08;
	
	#endif

	float invVis = 1.0 - uVisibility;

	pos *= uPartVisibility * uVisibility;
	pos.yz *= rotate( uSwap * TPI + invVis * 10.0);
	pos.z -= sin( uSwap * PI ) * 2.0 + invVis * 2.0;

	vec4 worldPos = modelMatrix * vec4( pos, 1.0 );
	vec4 mvPosition = viewMatrix * worldPos;

	gl_Position = projectionMatrix * mvPosition;

	/*-------------------------------
		Normal / Tangent
	-------------------------------*/

	vec3 transformedNormal = normalMatrix * normal;
	vec3 normal = normalize( transformedNormal );
	
	/*-------------------------------
		Shadow
	-------------------------------*/
	
	vec4 shadowWorldPos;
	
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			
			shadowWorldPos = worldPos + vec4( vec4( transformedNormal, 0.0 ) * modelMatrix ) * directionalLightShadows[ i ].shadowNormalBias;
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPos;
			
		}
		#pragma unroll_loop_end
		
	#endif

	/*-------------------------------
		Varying
	-------------------------------*/
	
	vUv = uv;
	vNormal = normal;
	vWorldPos = worldPos.xyz;
	vHighPrecisionZW = gl_Position.zw;
	
}