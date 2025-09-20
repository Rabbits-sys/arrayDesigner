import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { Position } from '../types'

type Props = {
  mics: Position[]
  onChange?: (mics: Position[]) => void
}

export default function Array3DView({ mics, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const micGroupRef = useRef<THREE.Group | null>(null)
  const meshesRef = useRef<THREE.Mesh[]>([])

  const raycasterRef = useRef(new THREE.Raycaster())
  const pointerRef = useRef(new THREE.Vector2())
  const planeRef = useRef(new THREE.Plane())
  const dragOffsetRef = useRef(new THREE.Vector3())
  const draggingRef = useRef(false)
  const selectedIdxRef = useRef<number | null>(null)

  const micsRef = useRef<Position[]>(mics)
  useEffect(() => { micsRef.current = mics }, [mics])
  const onChangeRef = useRef<Props['onChange']>(onChange)
  useEffect(() => { onChangeRef.current = onChange }, [onChange])

  const [_, setRenderTick] = useState(0) // trigger rerender for selection UI if needed

  useEffect(() => {
    const container = containerRef.current!
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x111111)
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.01, 1000)
    // Ensure Z is the up axis
    camera.up.set(0, 0, 1)
    camera.position.set(1.5, 1.2, 1.8)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(container.clientWidth, container.clientHeight)
    container.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    // Respect Z-up for orbiting
    controls.target.set(0, 0, 0)
    controls.update()

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.6))
    const dir = new THREE.DirectionalLight(0xffffff, 0.6)
    dir.position.set(3, 5, 2)
    scene.add(dir)

    // Axes helper & grid
    const axes = new THREE.AxesHelper(1.0)
    scene.add(axes)
    const grid = new THREE.GridHelper(4, 20, 0x444444, 0x222222)
    ;(grid.material as THREE.Material).opacity = 0.6
    ;(grid.material as THREE.Material).transparent = true
    // Rotate grid from default XZ-plane (y=0) to XY-plane (z=0)
    grid.rotation.x = Math.PI / 2
    scene.add(grid)

    // Group for microphones
    const micGroup = new THREE.Group()
    scene.add(micGroup)

    sceneRef.current = scene
    cameraRef.current = camera
    rendererRef.current = renderer
    controlsRef.current = controls
    micGroupRef.current = micGroup

    const onResize = () => {
      const w = container.clientWidth
      const h = container.clientHeight
      if (!rendererRef.current || !cameraRef.current) return
      rendererRef.current.setSize(w, h)
      cameraRef.current.aspect = w / h
      cameraRef.current.updateProjectionMatrix()
      setRenderTick(t => t + 1)
    }
    window.addEventListener('resize', onResize)

    let id = 0
    const animate = () => {
      id = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    // Pointer events for dragging
    const dom = renderer.domElement
    const updatePointer = (event: PointerEvent) => {
      const rect = dom.getBoundingClientRect()
      pointerRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      pointerRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    }

    const pickObject = (event: PointerEvent) => {
      if (!cameraRef.current || !sceneRef.current) return
      updatePointer(event)
      const raycaster = raycasterRef.current
      raycaster.setFromCamera(pointerRef.current, cameraRef.current)
      const intersects = raycaster.intersectObjects(meshesRef.current, false)
      if (intersects.length > 0) {
        const obj = intersects[0].object as THREE.Mesh
        const idx = meshesRef.current.indexOf(obj)
        if (idx >= 0) {
          selectedIdxRef.current = idx
          highlightSelection()
          // Setup dragging plane through the object, perpendicular to camera view
          const plane = planeRef.current
          const camDir = new THREE.Vector3()
          cameraRef.current.getWorldDirection(camDir)
          plane.setFromNormalAndCoplanarPoint(camDir, obj.position)
          // compute initial offset
          const intersection = new THREE.Vector3()
          if (raycaster.ray.intersectPlane(plane, intersection)) {
            dragOffsetRef.current.copy(obj.position).sub(intersection)
            draggingRef.current = true
            controlsRef.current?.enablePan && (controlsRef.current.enabled = false)
          }
        }
      } else {
        // deselect
        selectedIdxRef.current = null
        highlightSelection()
      }
    }

    const onPointerDown = (e: PointerEvent) => {
      pickObject(e)
    }
    const onPointerMove = (e: PointerEvent) => {
      if (!draggingRef.current || !cameraRef.current) return
      updatePointer(e)
      const raycaster = raycasterRef.current
      raycaster.setFromCamera(pointerRef.current, cameraRef.current)
      const plane = planeRef.current
      const intersection = new THREE.Vector3()
      if (raycaster.ray.intersectPlane(plane, intersection)) {
        const idx = selectedIdxRef.current
        if (idx != null && idx >= 0 && idx < meshesRef.current.length) {
          const mesh = meshesRef.current[idx]
          const newPos = new THREE.Vector3().copy(intersection).add(dragOffsetRef.current)
          mesh.position.copy(newPos)
          const base = micsRef.current
          if (onChangeRef.current) {
            const next = base.map((m, i) => (i === idx ? { x: newPos.x, y: newPos.y, z: newPos.z } : m))
            onChangeRef.current(next)
          }
        }
      }
    }
    const endDrag = () => {
      if (draggingRef.current) {
        draggingRef.current = false
        if (controlsRef.current) controlsRef.current.enabled = true
      }
    }

    dom.addEventListener('pointerdown', onPointerDown)
    dom.addEventListener('pointermove', onPointerMove)
    dom.addEventListener('pointerup', endDrag)
    dom.addEventListener('pointerleave', endDrag)

    return () => {
      window.removeEventListener('resize', onResize)
      cancelAnimationFrame(id)
      controls.dispose()
      renderer.dispose()
      container.removeChild(renderer.domElement)
      dom.removeEventListener('pointerdown', onPointerDown)
      dom.removeEventListener('pointermove', onPointerMove)
      dom.removeEventListener('pointerup', endDrag)
      dom.removeEventListener('pointerleave', endDrag)
    }
  }, [])

  // Build or update mic meshes
  useEffect(() => {
    const micGroup = micGroupRef.current
    if (!micGroup) return

    // Determine scale for spheres based on array extent
    const xs = mics.map((m) => m.x)
    const ys = mics.map((m) => m.y)
    const zs = mics.map((m) => m.z)
    const extent = Math.max(1e-3,
      Math.max(...xs, 0) - Math.min(...xs, 0),
      Math.max(...ys, 0) - Math.min(...ys, 0),
      Math.max(...zs, 0) - Math.min(...zs, 0))
    const radius = Math.max(0.005, extent * 0.02)

    const needRebuild = meshesRef.current.length !== mics.length
    if (needRebuild) {
      // clear group
      while (micGroup.children.length > 0) {
        const obj = micGroup.children.pop()!
        obj.traverse((child) => {
          const mesh = child as THREE.Mesh
          if (mesh.geometry) mesh.geometry.dispose()
          if ((mesh.material as any)?.dispose) (mesh.material as any).dispose()
        })
        micGroup.remove(obj)
      }
      meshesRef.current = []
      for (let i = 0; i < mics.length; i++) {
        const geom = new THREE.SphereGeometry(radius, 24, 16)
        const mat = new THREE.MeshStandardMaterial({ color: 0x00d8ff, roughness: 0.4, metalness: 0.1 })
        const sphere = new THREE.Mesh(geom, mat)
        sphere.position.set(mics[i].x, mics[i].y, mics[i].z)
        micGroup.add(sphere)
        meshesRef.current.push(sphere)
      }
    } else {
      // update positions and geometry if radius changed
      meshesRef.current.forEach((mesh, i) => {
        mesh.position.set(mics[i].x, mics[i].y, mics[i].z)
        const g = mesh.geometry as THREE.SphereGeometry
        const currentR = (g.parameters as any)?.radius
        if (Math.abs((currentR ?? radius) - radius) > 1e-6) {
          mesh.geometry.dispose()
          mesh.geometry = new THREE.SphereGeometry(radius, 24, 16)
        }
      })
    }

    // apply highlight if selection exists
    highlightSelection()
  }, [mics])

  function highlightSelection() {
    const idx = selectedIdxRef.current
    const meshes = meshesRef.current
    meshes.forEach((mesh, i) => {
      const mat = mesh.material as THREE.MeshStandardMaterial
      if (!mat) return
      if (i === idx) {
        mesh.scale.setScalar(1.8)
        mat.color.set(0xff7a00) // vivid orange
        mat.emissive = new THREE.Color(0x332200)
      } else {
        mesh.scale.setScalar(1.0)
        mat.color.set(0x00d8ff)
        mat.emissive = new THREE.Color(0x000000)
      }
    })
    setRenderTick(t => t + 1)
  }

  return <div className="panel" style={{ height: '100%', minHeight: 300 }}>
    <div className="panel-header"><h3>三维阵列视图</h3></div>
    <div ref={containerRef} style={{ width: '100%', height: 'calc(100% - 42px)', cursor: draggingRef.current ? 'grabbing' : 'default' }} />
  </div>
}
