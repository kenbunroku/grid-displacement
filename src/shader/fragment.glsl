varying vec2 vUv;

uniform vec2 uImageResolution;
uniform vec2 uContainerResolution;
uniform sampler2D uTexture;
uniform sampler2D uGrid;

vec2 coverUVs(vec2 imageResolution, vec2 containerResolution) {
  float imageAspectX = imageResolution.x / imageResolution.y;
  float imageAspectY = imageResolution.y / imageResolution.x;

  float containerAspectX = containerResolution.x / containerResolution.y;
  float containerAspectY = containerResolution.y / containerResolution.x;

  vec2 ratio = vec2(min(containerAspectX / imageAspectX, 1.), min(containerAspectY / imageAspectY, 1.));

  vec2 newUV = vec2(vUv.x * ratio.x + (1. - ratio.x) * 0.5, vUv.y * ratio.y + (1. - ratio.y) * 0.5);

  return newUV;
}

void main() {
  vec2 newUV = coverUVs(uImageResolution, uContainerResolution);
  vec2 squareUV = coverUVs(vec2(1.), uContainerResolution);

  vec4 image = texture(uTexture, newUV);
  vec4 displacement = texture(uGrid, squareUV);

  vec2 finalUV = newUV - displacement.rg * 0.01;

  vec2 redUV = finalUV;
  vec2 greenUV = finalUV;
  vec2 blueUV = finalUV;

  vec2 shift = displacement.rg * 0.001;

  float displacementStrength = length(displacement.rg);
  displacementStrength = clamp(displacementStrength, 0.0, 2.0);

  float redStrength = 1. + displacementStrength * 0.25;
  redUV += shift * redStrength;
  float greenStrength = 1. + displacementStrength * 1.5;
  greenUV += shift * greenStrength;
  float blueStrength = 1. + displacementStrength * 2.;
  blueUV += shift * blueStrength;

  float red = texture(uTexture, redUV).r;
  float green = texture(uTexture, greenUV).g;
  float blue = texture(uTexture, blueUV).b;

  vec4 finalImage = vec4(red, green, blue, 1.0);

  // gl_FragColor = image;
  // gl_FragColor = displacement;
  gl_FragColor = finalImage;
}
