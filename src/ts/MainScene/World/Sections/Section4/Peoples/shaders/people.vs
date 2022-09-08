attribute vec4 tangent;
attribute vec2 computeUV;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewNormal;
varying vec3 vViewPos;
varying vec3 vWorldPos;
varying float vAlpha;

uniform float time;

uniform float uVisibility;
uniform float uJump;
uniform float uSectionViewing;
uniform sampler2D dataPos;
uniform sampler2D dataVel;
uniform float aboutOffset;
uniform vec2 dataSize;
uniform float uTextSwitch;

#pragma glslify: import('./constants.glsl' )
#pragma glslify: atan2 = require('./atan2.glsl' )
#pragma glslify: rotate = require('./rotate.glsl' )
#pragma glslify: hsv2rgb = require('./hsv2rgb.glsl' )

#ifdef DEPTH

	varying vec2 vHighPrecisionZW;

#endif


float easeOutQuart( float t ) {

	return t < 0.5 ? 2.0 * t * t : -1.0 + ( 4.0 - 2.0 * t ) * t;

}

#define linearstep(edge0, edge1, x) min(max(((x) - (edge0)) / ((edge1) - (edge0)), 0.0), 1.0)

/*-------------------------------
	ShadowMap
-------------------------------*/

#include <shadowmap_pars_vertex>

mat3 makeRotationDir( vec3 direction, vec3 up ) {
	vec3 xaxis = normalize( cross( up, direction ) );
	vec3 yaxis = normalize( cross( direction, xaxis ) );

	return mat3(
		xaxis.x, yaxis.x, direction.x,
		xaxis.y, yaxis.y, direction.y,
		xaxis.z, yaxis.z, direction.z
	);

}

vec2 spriteUVSelector( vec2 uv, vec2 tile, float frames, float time, float offset ) {

	float t = floor(frames * mod( time, 1.0 ) );
	t += offset;

	uv.x += mod(t, tile.x);
	uv.y -= floor(t / tile.x);

	uv.y -= 1.0;
	uv /= tile;
	uv.y += 1.0;
	
	return uv;
	
}

void main( void ) {

	vAlpha = easeOutQuart( smoothstep( 0.0, 0.6, -computeUV.x + uVisibility * 1.6 ) );
	float posYOffset = 1.0 - easeOutQuart( smoothstep( 0.0, 0.6, -computeUV.x + (1.0 - uJump) * 1.6 ) );

	vec4 vel = texture2D( dataVel, computeUV );

	/*-------------------------------
		Position
	-------------------------------*/
	
    vec3 p = position;
	p *= (vAlpha);

    vec3 pos = vec3( 0.0 );
	pos.xyz = texture2D( dataPos, computeUV).xyz;
	// pos.y += sin( linearstep( 0.0, 1.0, -length( pos.xz ) * 0.1 + uTextSwitch * 3.0 + computeUV.x * 0.2 ) * PI ) * 0.5;
	pos.y += (posYOffset) * 12.0;
	pos.xz *= rotate( sin(computeUV.y * 20.0 + time * 0.6 + posYOffset ) * posYOffset * 0.2 );

	vec4 worldPos = modelMatrix * vec4( p + pos, 1.0 );
	vec4 mvPosition = viewMatrix * worldPos;
	
	gl_Position = projectionMatrix * mvPosition;
	
	vUv = uv;
	float offset = abs(vel.x) > 0.005 ? 16.0 : 0.0;

	vUv = spriteUVSelector( vUv, vec2( 16.0, 2.0 ), 16.0, time + computeUV.x, offset );

	if( offset > 0.0 && vel.x < 0.0 ) {
		vUv.x = 1.0 - vUv.x;
	}
	
	vNormal = normal;
	vViewPos = -mvPosition.xyz;
	vWorldPos = worldPos.xyz;

	#ifdef DEPTH
	
		vHighPrecisionZW = gl_Position.zw;
		
	#endif

}