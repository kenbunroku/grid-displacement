import * as THREE from "three";
import { REVISION } from "three";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { Pane } from "tweakpane";
import vertex from "./shader/vertex.glsl";
import fragment from "./shader/fragment.glsl";
import gpgpu from "./shader/gpgpu.glsl";
import image from "/image2.png";
import { GPUComputationRenderer } from "three/examples/jsm/Addons";

const gridSize = Math.ceil(Math.sqrt(700));

export default class Sketch {
  constructor(options) {
    this.scene = new THREE.Scene();

    this.container = options.dom;
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.width, this.height);
    this.renderer.setClearColor(0xffffff, 1);

    this.container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(
      75,
      this.width / this.height,
      0.1,
      1000
    );
    // let frustumSize = this.height;
    // let aspect = this.width / this.height;
    // this.camera = new THREE.OrthographicCamera(
    //   frustumSize * aspect * -0.5,
    //   frustumSize * aspect * 0.5,
    //   frustumSize * 0.5,
    //   frustumSize * -0.5,
    //   -1000,
    //   1000
    // );
    this.camera.position.set(0, 0, 2);
    this.time = 0;

    const THREE_PATH = `https://unpkg.com/three@0.${REVISION}.x`;
    this.dracoLoader = new DRACOLoader(
      new THREE.LoadingManager()
    ).setDecoderPath(`${THREE_PATH}/examples/jsm/libs/draco/gltf/`);
    this.gltfLoader = new GLTFLoader();
    this.gltfLoader.setDRACOLoader(this.dracoLoader);

    this.isPlaying = true;

    this.initAll();
  }

  initAll() {
    this.initGPUComputation();
    this.addObjects();
    this.resize();
    // this.addLights();
    this.createRayCaster();
    this.addEventListeners();
    // this.setupSettings();
    this.render();
  }

  initGPUComputation() {
    this.gpuComputation = new GPUComputationRenderer(
      gridSize,
      gridSize,
      this.renderer
    );

    this.dataTexture = this.gpuComputation.createTexture();
    console.log(this.dataTexture.image);

    this.variable = this.gpuComputation.addVariable(
      "uGrid",
      gpgpu,
      this.dataTexture
    );
    this.variable.material.uniforms.uGridSize = new THREE.Uniform(gridSize);
    this.variable.material.uniforms.uMouse = new THREE.Uniform(
      new THREE.Vector2(0, 0)
    );
    this.variable.material.uniforms.uDeltaMouse = new THREE.Uniform(
      new THREE.Vector2(0, 0)
    );
    this.variable.material.uniforms.uMouseMove = new THREE.Uniform(0);

    this.gpuComputation.setVariableDependencies(this.variable, [this.variable]);

    this.gpuComputation.init();
  }

  setupSettings() {
    this.settings = {
      progress: 0,
    };

    this.pane = new Pane();
    this.pane.addBinding(this.settings, "progress", {
      min: 0,
      max: 1,
      step: 0.01,
    });
  }

  addEventListeners() {
    window.addEventListener("resize", this.resize.bind(this));
    window.addEventListener("mousemove", this.onMouseMove.bind(this));
  }

  setViewportSize() {
    let fov = this.camera.fov * (Math.PI / 180);
    let height = this.camera.position.z * Math.tan(fov / 2) * 2;
    let width = height * this.camera.aspect;

    this.sizes = {
      width: width,
      height: height,
    };
  }

  setNodeBounds() {
    this.elementBounds = this.container.getBoundingClientRect();

    this.nodeDimensions = {
      width: this.elementBounds.width,
      height: this.elementBounds.height,
    };
  }

  setMeshDimensions() {
    this.meshDimensions = {
      width: (this.nodeDimensions.width * this.sizes.width) / window.innerWidth,
      height:
        (this.nodeDimensions.height * this.sizes.height) / window.innerHeight,
    };

    this.plane.scale.x = this.meshDimensions.width;
    this.plane.scale.y = this.meshDimensions.height;
  }

  setMeshPosition() {
    this.meshPostion = {
      x: (this.elementBounds.left * this.sizes.width) / window.innerWidth,
      y: (-this.elementBounds.top * this.sizes.height) / window.innerHeight,
    };

    this.meshPostion.x -= this.sizes.width / 2;
    this.meshPostion.x += this.meshDimensions.width / 2;
    this.meshPostion.y -= this.meshDimensions.height / 2;
    this.meshPostion.y += this.sizes.height / 2;

    this.plane.position.x = this.meshPostion.x;
    this.plane.position.y = this.meshPostion.y;
  }

  createRayCaster() {
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
  }

  onMouseMove(event) {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersects = this.raycaster.intersectObjects(this.scene.children);
    const target = intersects[0];
    if (target && "material" in target.object) {
      const targetMesh = intersects[0].object;

      if (targetMesh && target.uv) {
        this.updateMouse(target.uv);
      }
    }
  }

  updateMouse(uv) {
    this.variable.material.uniforms.uMouseMove.value = 1;
    const current = this.variable.material.uniforms.uMouse.value;

    current.subVectors(uv, current);
    current.multiplyScalar(80);

    this.variable.material.uniforms.uDeltaMouse.value = current;
    this.variable.material.uniforms.uMouse.value = uv;
  }

  resize() {
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;
    this.renderer.setSize(this.width, this.height);
    this.camera.aspect = this.width / this.height;

    this.setViewportSize();
    this.setNodeBounds();
    this.setMeshDimensions();
    this.setMeshPosition();

    this.camera.updateProjectionMatrix();
  }

  addObjects() {
    this.material = new THREE.ShaderMaterial({
      extensions: {
        derivatives: "#extension GL_OES_standard_derivatives : enable",
      },
      uniforms: {
        time: { value: 0 },
        uTexture: { value: new THREE.Uniform(new THREE.Vector4()) },
        uContainerResolution: { value: new THREE.Vector2() },
        uImageResolution: { value: new THREE.Vector2() },
        uGrid: { value: new THREE.Uniform(new THREE.Vector4()) },
      },
      vertexShader: vertex,
      fragmentShader: fragment,
    });

    this.texture = new THREE.TextureLoader().load(image, (texture) => {
      this.material.uniforms.uImageResolution.value.set(
        texture.image.width,
        texture.image.height
      );
      this.material.uniforms.uTexture.value = texture;
    });

    this.material.uniforms.uContainerResolution.value.set(
      this.width,
      this.height
    );

    this.geometry = new THREE.PlaneGeometry(1, 1);
    this.plane = new THREE.Mesh(this.geometry, this.material);
    this.scene.add(this.plane);

    this.setViewportSize();
    this.setNodeBounds();
    this.setMeshDimensions();
    this.setMeshPosition();
  }

  addLights() {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    this.directionalLight.position.set(1, 1, 1);
    this.scene.add(this.directionalLight);
  }

  render() {
    this.time += 0.01;

    this.variable.material.uniforms.uMouseMove.value *= 0.95;
    this.variable.material.uniforms.uDeltaMouse.value.multiplyScalar(0.95);

    this.gpuComputation.compute();
    this.material.uniforms.uGrid.value =
      this.gpuComputation.getCurrentRenderTarget(this.variable).textures[0];

    this.material.uniforms.time.value = this.time;
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.render.bind(this));
  }
}

new Sketch({
  dom: document.getElementById("canvas"),
});
