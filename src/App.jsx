import React, { useState, useMemo, useRef } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  Network, 
  ShieldAlert, 
  ChevronRight,
  ChevronDown,
  GitCommit,
  Lock,
  Unlock,
  XCircle,
  AlertCircle,
  Download,
  Upload,
  Printer,
  BookOpen,
  Image as ImageIcon,
  FileCode2,
  Pencil
} from 'lucide-react';

export default function App() {
  // Estados principales
  const [situations, setSituations] = useState([]);
  const [testCases, setTestCases] = useState([]);
  const [activeTab, setActiveTab] = useState('situations'); 
  const [expandedNodes, setExpandedNodes] = useState(new Set()); 

  // Estados de formularios y errores (Situaciones jerárquicas)
  const [sitParent, setSitParent] = useState('');
  const [sitSuffix, setSitSuffix] = useState('');
  const [sitDesc, setSitDesc] = useState('');
  const [sitInvalid, setSitInvalid] = useState(false);
  const [sitError, setSitError] = useState('');
  const [editingSitOriginalId, setEditingSitOriginalId] = useState(null);

  // Estados de formularios y errores (Casos de prueba)
  const [tcId, setTcId] = useState('');
  const [tcFails, setTcFails] = useState(false);
  const [tcLinkedSits, setTcLinkedSits] = useState([]);
  const [tcError, setTcError] = useState('');
  const [editingTcOriginalId, setEditingTcOriginalId] = useState(null);

  const fileInputRef = useRef(null);
  const svgRef = useRef(null); 

  // --- LÓGICA DE JERARQUÍA REAL ---
  const getExistingParentIds = (id) => {
    return situations
      .map(s => s.id)
      .filter(parentId => id.startsWith(parentId + '.') && id !== parentId);
  };

  const leafSituations = useMemo(() => {
    return situations.filter(sit => !situations.some(other => other.id.startsWith(sit.id + '.')));
  }, [situations]);

  const uncoveredSituations = useMemo(() => {
    const coveredIds = new Set(testCases.flatMap(tc => tc.situations));
    return leafSituations.filter(s => !coveredIds.has(s.id));
  }, [leafSituations, testCases]);

  const hasSituations = leafSituations.length > 0;
  const isAllCovered = hasSituations && uncoveredSituations.length === 0;

  // --- LÓGICA DE EXPANSIÓN ---
  const isVisible = (id) => {
    const parents = getExistingParentIds(id);
    return parents.every(p => expandedNodes.has(p));
  };

  const toggleExpand = (id) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // --- LÓGICA DE EXPORTACIÓN E IMPORTACIÓN JSON ---
  const handleExportData = () => {
    const data = { situations, testCases };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "trazabilidad_datos.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportData = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (Array.isArray(data.situations) && Array.isArray(data.testCases)) {
          const sortedSituations = [...data.situations].sort((a, b) => 
            a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' })
          );
          setSituations(sortedSituations);
          setTestCases(data.testCases);
          
          const roots = new Set(
            sortedSituations
              .filter(s => !sortedSituations.some(other => s.id.startsWith(other.id + '.') && s.id !== other.id))
              .map(s => s.id)
          );
          setExpandedNodes(roots);
          
          alert("Datos importados correctamente. Ya puedes editarlos.");
        } else {
          alert("El archivo JSON no tiene el formato correcto.");
        }
      } catch (error) {
        alert("Error al leer o procesar el archivo JSON.");
      }
    };
    reader.readAsText(file);
    event.target.value = null; 
  };

  const handleLoadExample = () => {
    const hasData = situations.length > 0 || testCases.length > 0;
    if (hasData && !window.confirm("¿Estás seguro de cargar el ejemplo? Se borrarán los datos actuales no exportados.")) {
      return;
    }
    
    const exampleData = {
      "situations": [
        { "id": "CP.01", "description": "Usuario", "invalid": false },
        { "id": "CP.01.01", "description": "Registrado", "invalid": false },
        { "id": "CP.01.02", "description": "Invitado", "invalid": false },
        { "id": "CP.02", "description": "Método de Pago", "invalid": false },
        { "id": "CP.02.01", "description": "Tarjeta", "invalid": false },
        { "id": "CP.02.02", "description": "Caducada", "invalid": true }
      ],
      "testCases": [
        { "id": "TC-1", "fails": false, "situations": ["CP.01.01", "CP.02.01"] },
        { "id": "TC-2", "fails": true, "situations": ["CP.02.02"] }
      ]
    };

    setSituations(exampleData.situations);
    setTestCases(exampleData.testCases);
    setExpandedNodes(new Set(['CP.01', 'CP.02'])); 
    setActiveTab('situations'); 
  };

  // --- MANEJADORES DE SITUACIONES ---
  const handleAddSituation = (e) => {
    e.preventDefault();
    setSitError('');
    
    const fullId = sitParent ? `${sitParent}.${sitSuffix.trim()}` : sitSuffix.trim();
    if (!fullId || !sitDesc.trim()) return;
    
    if (editingSitOriginalId) {
      if (fullId !== editingSitOriginalId && situations.some(s => s.id === fullId)) {
        setSitError("El ID de la situación ya existe. Por favor, usa uno único.");
        return;
      }
      
      const newSituations = situations.map(s => {
        if (s.id === editingSitOriginalId) {
          return { id: fullId, description: sitDesc, invalid: sitInvalid };
        }
        if (fullId !== editingSitOriginalId && s.id.startsWith(editingSitOriginalId + '.')) {
          return { ...s, id: fullId + s.id.slice(editingSitOriginalId.length) };
        }
        return s;
      });

      let newTestCases = testCases;
      if (fullId !== editingSitOriginalId) {
        newTestCases = testCases.map(tc => ({
          ...tc,
          situations: tc.situations.map(sid => 
            sid === editingSitOriginalId ? fullId : 
            (sid.startsWith(editingSitOriginalId + '.') ? fullId + sid.slice(editingSitOriginalId.length) : sid)
          )
        }));
      }

      newSituations.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }));
      setSituations(newSituations);
      setTestCases(newTestCases);
      setEditingSitOriginalId(null);
    } else {
      if (situations.some(s => s.id === fullId)) {
        setSitError("El ID de la situación ya existe. Por favor, usa uno único.");
        return;
      }
      
      const newSituations = [...situations, { id: fullId, description: sitDesc, invalid: sitInvalid }];
      newSituations.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }));
      setSituations(newSituations);
    }

    if (sitParent) {
      setExpandedNodes(prev => new Set([...prev, sitParent]));
    }

    setSitSuffix('');
    setSitDesc('');
    setSitInvalid(false);
  };

  const handleEditSituationClick = (sit) => {
    const parents = getExistingParentIds(sit.id);
    const immediateParent = parents.length > 0 ? parents[parents.length - 1] : '';

    if (immediateParent) {
      setSitParent(immediateParent);
      setSitSuffix(sit.id.substring(immediateParent.length + 1));
    } else {
      setSitParent('');
      setSitSuffix(sit.id);
    }
    
    setSitDesc(sit.description);
    setSitInvalid(sit.invalid);
    setEditingSitOriginalId(sit.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelSitEdit = () => {
    setEditingSitOriginalId(null);
    setSitParent('');
    setSitSuffix('');
    setSitDesc('');
    setSitInvalid(false);
    setSitError('');
  };

  const handleDeleteSituation = (id) => {
    const isParent = situations.some(s => s.id.startsWith(id + '.'));
    if (isParent && !window.confirm("Esta situación tiene sub-situaciones. ¿Seguro que quieres borrarla junto con todos sus hijos?")) {
      return;
    }
    
    setSituations(situations.filter(s => s.id !== id && !s.id.startsWith(id + '.'))); 
    setTestCases(testCases.map(tc => ({
      ...tc,
      situations: tc.situations.filter(sid => sid !== id && !sid.startsWith(id + '.'))
    })));
  };

  // --- MANEJADORES DE CASOS DE PRUEBA ---
  const handleAddTestCase = (e) => {
    e.preventDefault();
    setTcError('');
    if (!tcId.trim() || tcLinkedSits.length === 0) return;
    
    if (editingTcOriginalId) {
      if (tcId.trim() !== editingTcOriginalId && testCases.some(tc => tc.id === tcId.trim())) {
        setTcError("El ID del caso de prueba ya existe.");
        return;
      }
    } else {
      if (testCases.some(tc => tc.id === tcId.trim())) {
        setTcError("El ID del caso de prueba ya existe.");
        return;
      }
    }

    const invalidSelected = situations.filter(s => tcLinkedSits.includes(s.id) && s.invalid);
    
    if (invalidSelected.length > 0 && tcLinkedSits.length > 1) {
      setTcError("Un caso de prueba que cubre una situación inválida solo puede cubrir esa situación y ninguna más.");
      return;
    }

    if (invalidSelected.some(s => testCases.some(tc => tc.situations.includes(s.id) && tc.id !== editingTcOriginalId))) {
      setTcError("Una situación inválida solo puede asociarse a 1 caso de prueba.");
      return;
    }

    if (editingTcOriginalId) {
      setTestCases(testCases.map(tc => tc.id === editingTcOriginalId ? { id: tcId.trim(), fails: tcFails, situations: tcLinkedSits } : tc));
      setEditingTcOriginalId(null);
    } else {
      setTestCases([...testCases, { id: tcId.trim(), fails: tcFails, situations: tcLinkedSits }]);
    }
    
    setTcId('');
    setTcFails(false);
    setTcLinkedSits([]);
  };

  const handleEditTestCaseClick = (tc) => {
    setTcId(tc.id);
    setTcFails(tc.fails);
    setTcLinkedSits(tc.situations);
    setEditingTcOriginalId(tc.id);
  };

  const handleCancelTcEdit = () => {
    setEditingTcOriginalId(null);
    setTcId('');
    setTcFails(false);
    setTcLinkedSits([]);
    setTcError('');
  };

  const handleDeleteTestCase = (id) => {
    setTestCases(testCases.filter(tc => tc.id !== id));
  };

  const toggleTestCaseSituation = (sitId) => {
    setTcLinkedSits(prev => 
      prev.includes(sitId) ? prev.filter(id => id !== sitId) : [...prev, sitId]
    );
  };

  // --- EXPORTAR GRÁFICO ---
  const handleExportSVG = () => {
    if (!svgRef.current) return;
    const clone = svgRef.current.cloneNode(true);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const svgData = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'trazabilidad_grafico.svg';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPNG = () => {
    if (!svgRef.current) return;
    const clone = svgRef.current.cloneNode(true);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const svgData = new XMLSerializer().serializeToString(clone);
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    const width = parseInt(svgRef.current.getAttribute('width'));
    const height = parseInt(svgRef.current.getAttribute('height'));
    canvas.width = width * 2;
    canvas.height = height * 2;
    
    const img = new Image();
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    
    img.onload = () => {
      ctx.fillStyle = '#f8fafc'; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(2, 2); 
      ctx.drawImage(img, 0, 0);
      const pngUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = 'trazabilidad_grafico.png';
      a.click();
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  // --- GRÁFICO ---
  const renderGraph = () => {
    const sortedSituations = [...situations].sort((a, b) => 
      a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' })
    );
    
    const nodeMap = {};
    const roots = [];

    sortedSituations.forEach(sit => {
      nodeMap[sit.id] = { ...sit, children: [], isLeaf: true };
    });

    sortedSituations.forEach(sit => {
      const parts = sit.id.split('.');
      let parentId = null;
      for (let i = parts.length - 1; i > 0; i--) {
        const possibleParent = parts.slice(0, i).join('.');
        if (nodeMap[possibleParent]) {
          parentId = possibleParent;
          break;
        }
      }
      
      if (parentId) {
        nodeMap[parentId].children.push(nodeMap[sit.id]);
        nodeMap[parentId].isLeaf = false;
      } else {
        roots.push(nodeMap[sit.id]);
      }
    });

    let currentY = 20;
    const rightEdge = 340; 

    const traverseLayout = (node, depth) => {
      node.depth = depth;
      node.x = 20 + depth * 20; 
      node.w = rightEdge - node.x;

      if (node.children.length === 0) {
        node.isLeaf = true;
        node.y = currentY;
        node.h = 32; 
        currentY += node.h + 8; 
      } else {
        node.y = currentY;
        currentY += 24; 
        node.children.forEach(child => traverseLayout(child, depth + 1));
        node.h = currentY - node.y + 4; 
        currentY += 12; 
      }
    };

    roots.forEach(root => traverseLayout(root, 0));

    const sortedTestCases = [...testCases].sort((a, b) => 
      a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' })
    );
    
    let tcY = 20;
    const tcX = 540;
    const tcW = 100;
    const tcLayout = {};
    
    sortedTestCases.forEach(tc => {
      tcLayout[tc.id] = { ...tc, x: tcX, y: tcY, w: tcW, h: 32 };
      tcY += 32 + 12;
    });

    const svgHeight = Math.max(currentY, tcY) + 40;
    const svgWidth = 680;

    const getSituationStatusColor = (sitId) => {
      const linkedTCs = testCases.filter(tc => tc.situations.includes(sitId));
      if (linkedTCs.length === 0) return '#94a3b8'; 
      const allFail = linkedTCs.every(tc => tc.fails === true);
      return allFail ? '#ef4444' : '#10b981'; 
    };

    const renderSVGNode = (node) => {
      if (node.isLeaf) {
        const color = getSituationStatusColor(node.id);
        return (
          <g key={node.id}>
            <rect x={node.x} y={node.y} width={node.w} height={node.h} rx="6" fill="#ffffff" stroke={color} strokeWidth="2" />
            <text x={node.x + Math.max(10, node.w / 2)} y={node.y + 20} fontSize="13" fontWeight="bold" fill={color} textAnchor="middle">{node.id}</text>
          </g>
        );
      } else {
        return (
          <g key={node.id}>
            <rect x={node.x} y={node.y} width={node.w} height={node.h} rx="8" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="4 4" />
            <text x={node.x + 8} y={node.y + 16} fontSize="11" fontWeight="bold" fill="#64748b">{node.id}</text>
            {node.children.map(child => renderSVGNode(child))}
          </g>
        );
      }
    };

    return (
      <div className="w-full overflow-x-auto bg-slate-50 border border-slate-200 rounded-xl shadow-inner p-4 mt-6 print:border-none print:shadow-none print:mt-0 print:overflow-visible print:p-0 flex justify-center">
        <svg 
          ref={svgRef} 
          width={svgWidth} 
          height={svgHeight} 
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="bg-slate-50 print:bg-transparent"
          style={{ maxWidth: "100%", height: "auto", fontFamily: "ui-sans-serif, system-ui, sans-serif" }} 
        >
          <defs>
            <marker id="arrowhead-red" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
            </marker>
            <marker id="arrowhead-green" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#10b981" />
            </marker>
          </defs>

          {sortedTestCases.map((tc) => {
            const tcl = tcLayout[tc.id];
            const startX = tcl.x;
            const startY = tcl.y + (tcl.h / 2);
            const pathColor = tc.fails ? '#fca5a5' : '#6ee7b7'; 
            const hoverColor = tc.fails ? '#ef4444' : '#10b981'; 
            const marker = tc.fails ? 'url(#arrowhead-red)' : 'url(#arrowhead-green)';
            
            return tc.situations.map(sitId => {
              const targetNode = nodeMap[sitId];
              if (!targetNode || !targetNode.isLeaf) return null; 

              const endX = targetNode.x + targetNode.w; 
              const endY = targetNode.y + (targetNode.h / 2);

              const cp1X = startX - 60;
              const cp1Y = startY;
              const cp2X = endX + 60;
              const cp2Y = endY;

              return (
                <path
                  key={`${tc.id}-${sitId}`}
                  d={`M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX + 6} ${endY}`}
                  fill="none"
                  stroke={pathColor}
                  strokeWidth="2"
                  markerEnd={marker}
                  onMouseEnter={(e) => { e.target.setAttribute('stroke', hoverColor); e.target.setAttribute('stroke-width', '3'); }}
                  onMouseLeave={(e) => { e.target.setAttribute('stroke', pathColor); e.target.setAttribute('stroke-width', '2'); }}
                  style={{ cursor: 'pointer', transition: 'stroke 0.3s' }}
                />
              );
            });
          })}

          {roots.map(root => renderSVGNode(root))}

          {sortedTestCases.map((tc) => {
            const tcl = tcLayout[tc.id];
            const color = tc.fails ? '#ef4444' : '#10b981';

            return (
              <g key={`tc-${tc.id}`}>
                <rect x={tcl.x} y={tcl.y} width={tcl.w} height={tcl.h} rx="6" fill="#ffffff" stroke={color} strokeWidth="2" />
                <text x={tcl.x + (tcl.w / 2)} y={tcl.y + 20} fontSize="13" fontWeight="bold" fill={color} textAnchor="middle">{tc.id}</text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  // Variables para comprobar el estado de selección en el Caso de Prueba
  const hasInvalidSelected = tcLinkedSits.some(id => situations.find(s => s.id === id)?.invalid);
  const hasValidSelected = tcLinkedSits.some(id => {
    const s = situations.find(s => s.id === id);
    return s && !s.invalid;
  });

  return (
    <div className="min-h-screen bg-white md:bg-slate-50 text-slate-800 font-sans p-4 md:p-8 print:bg-white print:p-0">
      <div className="max-w-350 mx-auto space-y-6 w-full">
        
        {/* Header */}
        <header className="mb-8 flex flex-col xl:flex-row xl:items-start xl:justify-between gap-6 print:hidden">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Trazabilidad de Pruebas</h1>
            <p className="text-slate-500 mt-1">Gestión anidada de situaciones y validación de cobertura</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={handleLoadExample}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-200 rounded-lg text-sm font-medium text-indigo-700 hover:bg-indigo-100 transition-colors shadow-sm"
            >
              <BookOpen size={16} /> Cargar Ejemplo
            </button>
            <input 
              type="file" 
              accept=".json" 
              ref={fileInputRef} 
              onChange={handleImportData} 
              className="hidden" 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
            >
              <Upload size={16} /> Importar
            </button>
            <button 
              onClick={handleExportData}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
            >
              <Download size={16} /> Exportar JSON
            </button>
          </div>
        </header>

        {/* Global Warning Banner */}
        {uncoveredSituations.length > 0 && (
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg shadow-sm flex items-start gap-3 print:hidden">
            <ShieldAlert className="text-amber-500 mt-0.5 shrink-0" size={24} />
            <div>
              <h3 className="text-amber-800 font-bold">¡Atención! Situaciones de último nivel sin cubrir</h3>
              <p className="text-amber-700 text-sm mt-1">
                Falta cubrir {uncoveredSituations.length} situación(es) hoja para completar la trazabilidad.
              </p>
            </div>
          </div>
        )}

        {/* Tabs Navigation */}
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 bg-slate-200/50 p-1.5 rounded-xl print:hidden">
          <button 
            onClick={() => setActiveTab('situations')} 
            className={`flex-1 py-3 px-4 text-sm font-bold rounded-lg transition-all flex justify-center items-center gap-2 ${activeTab === 'situations' ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'}`}
          >
            <AlertTriangle size={18} /> 1. Situaciones de Prueba
          </button>
          <button 
            onClick={() => setActiveTab('testCases')} 
            className={`flex-1 py-3 px-4 text-sm font-bold rounded-lg transition-all flex justify-center items-center gap-2 ${activeTab === 'testCases' ? 'bg-white text-emerald-700 shadow-sm border border-slate-200/50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'}`}
          >
            <CheckCircle2 size={18} /> 2. Casos de Prueba
          </button>
          <button 
            onClick={() => isAllCovered && setActiveTab('graph')} 
            disabled={!isAllCovered}
            className={`flex-1 py-3 px-4 text-sm font-bold rounded-lg transition-all flex justify-center items-center gap-2 ${activeTab === 'graph' ? 'bg-white text-purple-700 shadow-sm border border-slate-200/50' : isAllCovered ? 'text-slate-600 hover:text-purple-600 hover:bg-slate-200/70' : 'text-slate-400 cursor-not-allowed'}`}
          >
            <Network size={18} /> 3. Gráfico Trazabilidad
            {isAllCovered ? <Unlock size={14} className="ml-1" /> : <Lock size={14} className="ml-1" />}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
          
          {/* TAB 1: Situaciones */}
          <div className={`lg:col-span-12 space-y-6 ${activeTab !== 'situations' ? 'hidden' : ''} print:hidden`}>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-bold mb-4">{editingSitOriginalId ? 'Editar Situación' : 'Añadir Situación de Prueba'}</h2>
              
              {sitError && (
                <div className="mb-4 flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg border border-red-200 text-sm font-medium">
                  <AlertCircle size={18} /> {sitError}
                </div>
              )}

              <form onSubmit={handleAddSituation} className="space-y-4">
                <div className="flex flex-col md:flex-row gap-4 items-end">
                  
                  {/* Selector de Situación Padre */}
                  <div className="w-full md:w-[22%]">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Situación Padre</label>
                    <select 
                      value={sitParent} 
                      onChange={e => setSitParent(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900"
                    >
                      <option value="">Ninguno (Raíz)</option>
                      {situations
                        .filter(s => !editingSitOriginalId || (s.id !== editingSitOriginalId && !s.id.startsWith(editingSitOriginalId + '.')))
                        .map(s => (
                          <option key={s.id} value={s.id}>{s.id} - {s.description.substring(0, 20)}</option>
                      ))}
                    </select>
                  </div>

                  {/* Input de ID (Sufijo) */}
                  <div className="w-full md:w-[22%]">
                    <label className="block text-sm font-medium text-slate-700 mb-1">ID (Sufijo)</label>
                    <div className="flex">
                      {sitParent && (
                        <span className="inline-flex items-center px-3 border border-r-0 border-slate-300 bg-slate-100 text-slate-600 sm:text-sm rounded-l-lg font-bold">
                          {sitParent}.
                        </span>
                      )}
                      <input 
                        required 
                        type="text" 
                        value={sitSuffix} 
                        onChange={e => {setSitSuffix(e.target.value); setSitError('');}} 
                        placeholder="Ej. 01" 
                        className={`w-full px-3 py-2 border outline-none transition-all bg-white text-slate-900 ${sitError ? 'border-red-400 focus:ring-red-500' : 'border-slate-300 focus:ring-2 focus:ring-indigo-500'} ${sitParent ? 'rounded-none rounded-r-lg' : 'rounded-lg'}`} 
                      />
                    </div>
                  </div>

                  <div className="w-full md:w-[35%]">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
                    <input required type="text" value={sitDesc} onChange={e => setSitDesc(e.target.value)} placeholder="Breve descripción..." className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white text-slate-900" />
                  </div>

                  <div className="w-full md:w-auto flex items-center gap-3 mb-1 h-10">
                    <label className="flex items-center gap-2 cursor-pointer px-3 hover:bg-slate-50 rounded-lg h-full border border-slate-200 transition-colors bg-white">
                      <input type="checkbox" checked={sitInvalid} onChange={e => setSitInvalid(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
                      <span className="font-medium text-sm text-slate-700">¿Inválida?</span>
                    </label>
                    <button type="submit" className="shrink-0 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg font-medium transition-colors h-full shadow-sm">
                      {editingSitOriginalId ? <><Pencil size={20} className="mr-2"/> Actualizar</> : <><Plus size={20} className="mr-2"/> Añadir</>}
                    </button>
                    {editingSitOriginalId && (
                      <button type="button" onClick={handleCancelSitEdit} className="shrink-0 flex items-center justify-center bg-slate-200 hover:bg-slate-300 text-slate-700 px-5 py-2 rounded-lg font-medium transition-colors h-full shadow-sm">
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              </form>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 font-semibold text-slate-700">Listado de Situaciones</div>
              <div className="p-4 space-y-2">
                {situations.length === 0 ? (
                  <p className="text-center text-slate-400 py-6">No hay situaciones. Añade la primera arriba.</p>
                ) : (
                  situations.map(sit => {
                    if (!isVisible(sit.id)) return null;

                    const isLeaf = leafSituations.some(l => l.id === sit.id);
                    const isUncovered = isLeaf && uncoveredSituations.some(u => u.id === sit.id);
                    const indentCount = getExistingParentIds(sit.id).length;

                    return (
                      <div key={sit.id} style={{ marginLeft: `${indentCount * 1.5}rem` }} className={`p-3 rounded-lg border flex justify-between items-center transition-all ${isUncovered ? 'bg-amber-50/50 border-amber-200' : 'bg-white border-slate-200 hover:border-indigo-300'}`}>
                        <div className="flex items-center gap-3">
                          {indentCount > 0 && <GitCommit className="text-slate-300 rotate-90" size={16} />}
                          
                          {!isLeaf && (
                            <button onClick={() => toggleExpand(sit.id)} className="p-1 hover:bg-slate-200 rounded text-slate-500 transition-colors">
                              {expandedNodes.has(sit.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </button>
                          )}

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800">{sit.id}</span>
                              {sit.invalid && <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full border border-red-200 font-bold tracking-wider" title="Situación Inválida">Inválido</span>}
                              {isLeaf ? (
                                <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full border border-indigo-100">Último Nivel</span>
                              ) : (
                                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Padre</span>
                              )}
                              {isUncovered && <span className="text-[10px] text-amber-600 font-bold bg-amber-100 px-2 py-0.5 rounded-full">Falta Cubrir</span>}
                            </div>
                            <p className="text-sm text-slate-600 mt-0.5">{sit.description}</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => handleEditSituationClick(sit)} className="text-slate-400 hover:text-indigo-500 transition-colors p-2">
                            <Pencil size={18} />
                          </button>
                          <button onClick={() => handleDeleteSituation(sit.id)} className="text-slate-400 hover:text-red-500 transition-colors p-2">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* TAB 2: Casos de Prueba */}
          <div className={`lg:col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-6 ${activeTab !== 'testCases' ? 'hidden' : ''} print:hidden`}>
             <div className="lg:col-span-5 h-fit bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-bold mb-4">{editingTcOriginalId ? 'Editar Caso de Prueba' : 'Añadir Caso de Prueba'}</h2>
              
              {tcError && (
                <div className="mb-4 flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg border border-red-200 text-sm font-medium">
                  <AlertCircle size={18} /> {tcError}
                </div>
              )}

              <form onSubmit={handleAddTestCase} className="space-y-5">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">ID Caso de Prueba</label>
                    <input required type="text" value={tcId} onChange={e => {setTcId(e.target.value.toUpperCase()); setTcError('');}} placeholder="Ej. TC-01" className={`w-full px-3 py-2 border rounded-lg outline-none transition-all bg-white text-slate-900 ${tcError ? 'border-red-400 focus:ring-red-500' : 'border-slate-300 focus:ring-2 focus:ring-emerald-500'}`} />
                  </div>
                  <div>
                    <label className="flex items-center gap-3 cursor-pointer p-3 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-lg transition-colors w-full shadow-sm">
                      <input type="checkbox" checked={tcFails} onChange={e => setTcFails(e.target.checked)} className="w-5 h-5 text-red-600 rounded border-slate-300 focus:ring-red-500" />
                      <span className="font-medium text-slate-700">¿Este caso de prueba FALLA?</span>
                    </label>
                  </div>
                </div>

                {/* Contenedor para mostrar las situaciones que ya se han seleccionado */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Situaciones Seleccionadas</label>
                  {tcLinkedSits.length === 0 ? (
                    <p className="text-sm text-slate-500 italic p-3 bg-slate-50 rounded-lg border border-slate-200 shadow-inner">No has seleccionado ninguna situación.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200 shadow-inner">
                      {tcLinkedSits.map(sitId => {
                        const sit = situations.find(s => s.id === sitId);
                        const isInvalid = sit?.invalid;
                        
                        return (
                          <div key={sitId} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium shadow-sm ${isInvalid ? 'bg-red-100 text-red-800 border-red-300' : 'bg-emerald-100 text-emerald-800 border-emerald-200'}`}>
                            <span>{sitId} {sit ? `- ${sit.description}` : ''}</span>
                            <button type="button" onClick={() => toggleTestCaseSituation(sitId)} className={`transition-colors ${isInvalid ? 'hover:text-red-900' : 'hover:text-emerald-900'}`}>
                              <XCircle size={16} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Asociar a Situaciones de Último Nivel</label>
                  {situations.length === 0 ? (
                    <p className="text-sm text-slate-500 italic p-3 bg-slate-50 rounded-lg border border-slate-200">Crea situaciones primero en la pestaña 1.</p>
                  ) : (
                    <div className="max-h-96 overflow-y-auto space-y-1 border border-slate-200 rounded-lg p-2 bg-slate-50 shadow-inner">
                      {situations.map(sit => {
                        if (!isVisible(sit.id)) return null;
                        
                        const isLeaf = leafSituations.some(l => l.id === sit.id);
                        
                        // Ocultamos la situación si ya la tenemos seleccionada
                        if (tcLinkedSits.includes(sit.id)) return null;

                        // Ocultamos la situación si pertenece a OTRO caso de prueba 
                        const isAssignedToOther = testCases.some(tc => tc.situations.includes(sit.id) && tc.id !== editingTcOriginalId);
                        if (isLeaf && isAssignedToOther) return null;

                        const indentCount = getExistingParentIds(sit.id).length;
                        
                        // Desactivación lógica según si se han marcado válidas o inválidas
                        let isDisabled = !isLeaf;
                        if (isLeaf) {
                          if (hasInvalidSelected) {
                            isDisabled = true;
                          } else if (hasValidSelected && sit.invalid) {
                            isDisabled = true;
                          }
                        }

                        // Clases dinámicas para estilar el contenedor
                        let containerClasses = "flex items-center gap-2 p-2 rounded transition-colors ";
                        if (isDisabled) {
                          containerClasses += sit.invalid 
                            ? "opacity-60 border border-red-200 bg-red-50/50" 
                            : "opacity-60 border border-transparent";
                        } else {
                          containerClasses += sit.invalid 
                            ? "bg-white border border-red-400 hover:bg-red-50 shadow-sm" 
                            : "hover:bg-white bg-slate-50/50 border border-transparent hover:border-slate-200 shadow-sm";
                        }
                        
                        return (
                          <div key={sit.id} style={{ marginLeft: `${indentCount * 1.5}rem` }} className={containerClasses}>
                            {!isLeaf ? (
                              <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleExpand(sit.id); }} className="p-0.5 hover:bg-slate-200 rounded text-slate-500 transition-colors shrink-0 z-10 relative">
                                {expandedNodes.has(sit.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                              </button>
                            ) : <div className="w-5 shrink-0" />}
                            <label className={`flex items-center gap-2 w-full m-0 ${!isDisabled ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                              <input 
                                type="checkbox" 
                                disabled={isDisabled} 
                                checked={tcLinkedSits.includes(sit.id)} 
                                onChange={() => toggleTestCaseSituation(sit.id)} 
                                className={`w-4 h-4 rounded focus:ring-emerald-500 disabled:opacity-50 ${sit.invalid ? 'text-red-600 border-red-300' : 'text-emerald-600 border-slate-300'}`} 
                              />
                              <span className="text-sm font-bold text-slate-700">{sit.id}</span>
                              {sit.invalid && <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded border border-red-200 font-bold tracking-wide">Inválida</span>}
                              <span className="text-sm text-slate-600 truncate">- {sit.description}</span>
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button type="submit" disabled={situations.length === 0 || tcLinkedSits.length === 0} className="flex-1 flex justify-center items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg font-bold transition-colors shadow-sm">
                    {editingTcOriginalId ? <><Pencil size={18} /> Actualizar Caso</> : <><Plus size={18} /> Guardar Caso</>}
                  </button>
                  {editingTcOriginalId && (
                    <button type="button" onClick={handleCancelTcEdit} className="flex justify-center items-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-3 rounded-lg font-bold transition-colors shadow-sm">
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            </div>
            
            <div className="lg:col-span-7 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
               <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 font-semibold text-slate-700">Listado de Casos de Prueba</div>
               <div className="p-4 space-y-3 h-150 overflow-y-auto">
                 {testCases.map(tc => (
                   <div key={tc.id} className="p-4 rounded-lg border flex justify-between items-start transition-all bg-white hover:border-emerald-300 border-slate-200">
                     <div className="w-full pr-4">
                       <span className="font-bold text-slate-800 text-lg mr-2">{tc.id}</span>
                       <div className="flex flex-wrap gap-1.5 mt-2">
                         {tc.situations.map(sitId => (
                           <span key={sitId} className="flex items-center gap-1 text-[11px] font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded-md border border-slate-200">
                             <ChevronRight size={12} /> {sitId}
                           </span>
                         ))}
                       </div>
                     </div>
                     <div className="flex flex-col gap-1">
                       <button onClick={() => handleEditTestCaseClick(tc)} className="text-slate-400 hover:text-emerald-500 transition-colors p-2 bg-slate-50 hover:bg-emerald-50 rounded-lg"><Pencil size={20} /></button>
                       <button onClick={() => handleDeleteTestCase(tc.id)} className="text-slate-400 hover:text-red-500 transition-colors p-2 bg-slate-50 hover:bg-red-50 rounded-lg"><Trash2 size={20} /></button>
                     </div>
                   </div>
                 ))}
               </div>
            </div>
          </div>

          {/* TAB 3: Gráfico */}
          {activeTab === 'graph' && isAllCovered && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full lg:col-span-12 print:block">
              <div className="flex flex-wrap justify-end gap-3 mb-4 print:hidden">
                <button 
                  onClick={handleExportPNG}
                  className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
                >
                  <ImageIcon size={16} /> Descargar PNG
                </button>
                <button 
                  onClick={handleExportSVG}
                  className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
                >
                  <FileCode2 size={16} /> Descargar SVG
                </button>
                <button 
                  onClick={() => window.print()}
                  className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
                >
                  <Printer size={16} /> Imprimir A4
                </button>
              </div>
              
              {renderGraph()}
              
              <div className="text-center mt-6 text-sm text-slate-500 print:hidden bg-white p-4 rounded-xl border border-slate-200 shadow-sm inline-block mx-auto items-center justify-center">
                <span className="inline-flex items-center gap-1.5 text-red-600 font-medium mr-6"><XCircle size={16}/> Rojo: Casos fallidos</span>
                <span className="inline-flex items-center gap-1.5 text-emerald-600 font-medium mr-6"><CheckCircle2 size={16}/> Verde: Casos exitosos</span>
                <span className="inline-flex items-center gap-1.5 text-slate-500 font-medium"><div className="w-3 h-3 border border-slate-400 border-dashed rounded-sm bg-slate-100"></div> Gris (Rayado): Situación Padre</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}