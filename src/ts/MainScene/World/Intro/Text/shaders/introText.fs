uniform sampler2D tex;
uniform float visibility;
varying vec2 vUv;

void main( void ) {

	vec4 col = texture2D( tex, vUv );
	col.w *= visibility;

	gl_FragColor = col;

}