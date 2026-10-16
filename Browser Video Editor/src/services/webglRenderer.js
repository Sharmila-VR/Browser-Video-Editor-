const VERTEX_SHADER_SOURCE = `
attribute vec2 a_position;
attribute vec2 a_texCoord;
varying vec2 v_texCoord;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texCoord = vec2(a_texCoord.x, 1.0 - a_texCoord.y);
}
`

const FRAGMENT_SHADER_SOURCE = `
precision mediump float;
varying vec2 v_texCoord;

uniform sampler2D u_imageA;
uniform sampler2D u_imageB;
uniform int u_hasImageB;
uniform float u_crossfade;
uniform float u_brightness;
uniform float u_contrast;
uniform float u_blur;
uniform vec2 u_resolution;

vec4 sampleBlur(sampler2D tex, vec2 uv, float radius) {
  if (radius <= 0.01) {
    return texture2D(tex, uv);
  }
  vec4 sum = vec4(0.0);
  vec2 step = radius / u_resolution;
  
  sum += texture2D(tex, uv + vec2(-step.x, -step.y)) * 0.075;
  sum += texture2D(tex, uv + vec2(0.0, -step.y)) * 0.125;
  sum += texture2D(tex, uv + vec2(step.x, -step.y)) * 0.075;
  
  sum += texture2D(tex, uv + vec2(-step.x, 0.0)) * 0.125;
  sum += texture2D(tex, uv) * 0.2;
  sum += texture2D(tex, uv + vec2(step.x, 0.0)) * 0.125;
  
  sum += texture2D(tex, uv + vec2(-step.x, step.y)) * 0.075;
  sum += texture2D(tex, uv + vec2(0.0, step.y)) * 0.125;
  sum += texture2D(tex, uv + vec2(step.x, step.y)) * 0.075;
  
  return sum;
}

void main() {
  vec4 colorA = sampleBlur(u_imageA, v_texCoord, u_blur);
  vec4 finalColor = colorA;

  if (u_hasImageB == 1) {
    vec4 colorB = sampleBlur(u_imageB, v_texCoord, u_blur);
    finalColor = mix(colorA, colorB, clamp(u_crossfade, 0.0, 1.0));
  }

  vec3 rgb = finalColor.rgb;
  rgb = (rgb - 0.5) * u_contrast + 0.5;
  rgb += u_brightness;
  
  gl_FragColor = vec4(clamp(rgb, 0.0, 1.0), finalColor.a);
}
`

export class WebGLRenderer {
  constructor(canvas) {
    this.canvas = canvas
    this.gl = canvas.getContext('webgl', { preserveDrawingBuffer: true, alpha: false })
    if (!this.gl) {
      this.gl = canvas.getContext('experimental-webgl', { preserveDrawingBuffer: true, alpha: false })
    }
    this.program = null
    this.textureA = null
    this.textureB = null
    this.positionBuffer = null
    this.texCoordBuffer = null
    this.init()
  }

  createShader(gl, type, source) {
    const shader = gl.createShader(type)
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader)
      return null
    }
    return shader
  }

  init() {
    const gl = this.gl
    if (!gl) return

    const vertexShader = this.createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE)
    const fragmentShader = this.createShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SOURCE)
    if (!vertexShader || !fragmentShader) return

    const program = gl.createProgram()
    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      return
    }
    this.program = program

    this.positionBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        -1.0, -1.0,
         1.0, -1.0,
        -1.0,  1.0,
        -1.0,  1.0,
         1.0, -1.0,
         1.0,  1.0
      ]),
      gl.STATIC_DRAW
    )

    this.texCoordBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        0.0, 0.0,
        1.0, 0.0,
        0.0, 1.0,
        0.0, 1.0,
        1.0, 0.0,
        1.0, 1.0
      ]),
      gl.STATIC_DRAW
    )

    this.textureA = gl.createTexture()
    this.setupTexture(this.textureA)

    this.textureB = gl.createTexture()
    this.setupTexture(this.textureB)
  }

  setupTexture(tex) {
    const gl = this.gl
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  }

  render(params) {
    const {
      sourceA,
      sourceB = null,
      crossfade = 0.0,
      brightness = 0.0,
      contrast = 1.0,
      blur = 0.0
    } = params

    const gl = this.gl
    if (!gl || !this.program) return

    gl.viewport(0, 0, this.canvas.width, this.canvas.height)
    gl.useProgram(this.program)

    const posLoc = gl.getAttribLocation(this.program, 'a_position')
    gl.enableVertexAttribArray(posLoc)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer)
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)

    const texCoordLoc = gl.getAttribLocation(this.program, 'a_texCoord')
    gl.enableVertexAttribArray(texCoordLoc)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer)
    gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0)

    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.textureA)
    if (sourceA) {
      try {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceA)
      } catch {
        this.fillPlaceholderTexture(this.textureA, '#111827')
      }
    } else {
      this.fillPlaceholderTexture(this.textureA, '#000000')
    }
    gl.uniform1i(gl.getUniformLocation(this.program, 'u_imageA'), 0)

    let hasImageB = 0
    if (sourceB) {
      gl.activeTexture(gl.TEXTURE1)
      gl.bindTexture(gl.TEXTURE_2D, this.textureB)
      try {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceB)
        hasImageB = 1
      } catch {
        hasImageB = 0
      }
      gl.uniform1i(gl.getUniformLocation(this.program, 'u_imageB'), 1)
    }

    gl.uniform1i(gl.getUniformLocation(this.program, 'u_hasImageB'), hasImageB)
    gl.uniform1f(gl.getUniformLocation(this.program, 'u_crossfade'), crossfade)
    gl.uniform1f(gl.getUniformLocation(this.program, 'u_brightness'), brightness)
    gl.uniform1f(gl.getUniformLocation(this.program, 'u_contrast'), contrast)
    gl.uniform1f(gl.getUniformLocation(this.program, 'u_blur'), blur)
    gl.uniform2f(gl.getUniformLocation(this.program, 'u_resolution'), this.canvas.width, this.canvas.height)

    gl.drawArrays(gl.TRIANGLES, 0, 6)
  }

  fillPlaceholderTexture(tex, colorHex) {
    const gl = this.gl
    gl.bindTexture(gl.TEXTURE_2D, tex)
    const color = this.hexToRgb(colorHex)
    const pixel = new Uint8Array([color.r, color.g, color.b, 255])
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixel)
  }

  hexToRgb(hex) {
    let clean = hex.replace('#', '')
    if (clean.length === 3) {
      clean = clean.split('').map((c) => c + c).join('')
    }
    const num = parseInt(clean, 16)
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255
    }
  }

  clear() {
    const gl = this.gl
    if (!gl) return
    gl.clearColor(0.05, 0.07, 0.1, 1.0)
    gl.clear(gl.COLOR_BUFFER_BIT)
  }

  destroy() {
    const gl = this.gl
    if (!gl) return
    if (this.textureA) gl.deleteTexture(this.textureA)
    if (this.textureB) gl.deleteTexture(this.textureB)
    if (this.positionBuffer) gl.deleteBuffer(this.positionBuffer)
    if (this.texCoordBuffer) gl.deleteBuffer(this.texCoordBuffer)
    if (this.program) gl.deleteProgram(this.program)
    this.program = null
    this.gl = null
  }
}
