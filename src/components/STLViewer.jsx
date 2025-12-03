import { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import * as THREE from 'three';
import { loadSTLFile } from '../services/stlService';
import './STLViewer.css';

// Componente que renderiza o modelo STL
const STLModel = ({ url, onError, onLoad }) => {
  const meshRef = useRef();
  const [geometry, setGeometry] = useState(null);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    // Prevenir múltiplos carregamentos
    if (hasLoadedRef.current) {
      return;
    }
    
    hasLoadedRef.current = true;
    
    const loader = new STLLoader();

    const loadModel = async () => {
      try {
        const arrayBuffer = await loadSTLFile(url);
        
        const parsedGeometry = loader.parse(arrayBuffer);
        
        // Centralizar
        parsedGeometry.computeBoundingBox();
        const center = new THREE.Vector3();
        parsedGeometry.boundingBox.getCenter(center);
        parsedGeometry.translate(-center.x, -center.y, -center.z);
        parsedGeometry.computeVertexNormals();
        
        setGeometry(parsedGeometry);
        onLoad();
      } catch (error) {
        console.error('[STLModel] Erro:', error);
        onError(error);
      }
    };

    loadModel();

    return () => {
      if (geometry) {
        geometry.dispose();
      }
    };
  }, []); // Array vazio - carregar apenas uma vez

  if (!geometry) {
    return null;
  }

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial 
        color="#ffffff" 
        roughness={0.5}
        metalness={0.2}
      />
    </mesh>
  );
};

const STLViewer = ({ url, className = '', formatUrl }) => {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef(null);

  const handleError = useCallback((err) => {
    console.error('[STLViewer] Erro:', err);
    setError(true);
    setLoading(false);
  }, []);

  const handleLoad = useCallback(() => {
    setLoading(false);
    setError(false);
  }, []);

  if (!url || url.trim() === '') {
    return null;
  }

  // Se houver erro, não mostrar nada
  if (error) {
    return null;
  }

  return (
    <div className={`stl-viewer-container ${className}`} ref={containerRef}>
      {loading && (
        <div className="stl-viewer-loading">
          <div className="spinner"></div>
          <p>Carregando modelo 3D...</p>
        </div>
      )}
      
      <div style={{ 
        width: '100%', 
        height: '400px',
        visibility: loading ? 'hidden' : 'visible',
        position: loading ? 'absolute' : 'relative'
      }}>
        <Canvas
          camera={{ position: [0, 0, 100], fov: 50 }}
          style={{ width: '100%', height: '100%' }}
        >
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <directionalLight position={[-10, -10, -5]} intensity={0.5} />
          <STLModel url={url} onError={handleError} onLoad={handleLoad} />
          <OrbitControls 
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            enableDamping={true}
            dampingFactor={0.05}
            minDistance={10}
            maxDistance={500}
            touches={{
              ONE: THREE.TOUCH.ROTATE,
              TWO: THREE.TOUCH.DOLLY_PAN
            }}
          />
        </Canvas>
      </div>
      
      {!loading && (
        <div className="stl-viewer-controls">
          <small>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            <span className="desktop-hint">Arraste para rotacionar • Scroll para zoom • Botão direito para mover</span>
            <span className="mobile-hint">Toque para rotacionar • Pinça para zoom • Dois dedos para mover</span>
          </small>
        </div>
      )}
    </div>
  );
};

export default STLViewer;
