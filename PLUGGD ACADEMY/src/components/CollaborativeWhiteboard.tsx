import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Slider } from './ui/slider';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { Card, CardContent } from './ui/card';
import { WhiteboardData } from './utils/webrtc';
import {
  PenTool,
  Eraser,
  Type,
  Square,
  Circle,
  MousePointer,
  Undo,
  Redo,
  Save,
  Trash2,
  Download,
  Upload,
  Grid3X3,
  Palette,
  Layers,
  Move,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface WhiteboardTool {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  cursor: string;
}

export interface DrawingData {
  tool: string;
  points: Array<{ x: number; y: number; pressure?: number }>;
  color: string;
  size: number;
  timestamp: number;
  userId: string;
  id: string;
}

export interface CollaborativeWhiteboardProps {
  isActive: boolean;
  userId: string;
  userName: string;
  onClose?: () => void;
  onDataChange?: (data: WhiteboardData) => void;
  isReadOnly?: boolean;
  className?: string;
}

const TOOLS: WhiteboardTool[] = [
  { id: 'pen', name: 'Pen', icon: PenTool, cursor: 'crosshair' },
  { id: 'eraser', name: 'Eraser', icon: Eraser, cursor: 'crosshair' },
  { id: 'text', name: 'Text', icon: Type, cursor: 'text' },
  { id: 'rectangle', name: 'Rectangle', icon: Square, cursor: 'crosshair' },
  { id: 'circle', name: 'Circle', icon: Circle, cursor: 'crosshair' },
  { id: 'select', name: 'Select', icon: MousePointer, cursor: 'default' }
];

const COLORS = [
  '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', 
  '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080',
  '#FFC0CB', '#A52A2A', '#808080', '#00CED1', '#FF6347'
];

const BRUSH_SIZES = [1, 2, 4, 6, 8, 12, 16, 24, 32];

export function CollaborativeWhiteboard({
  isActive,
  userId,
  userName,
  onClose,
  onDataChange,
  isReadOnly = false,
  className = ''
}: CollaborativeWhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState<string>('pen');
  const [currentColor, setCurrentColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState([4]);
  const [drawings, setDrawings] = useState<DrawingData[]>([]);
  const [currentDrawing, setCurrentDrawing] = useState<DrawingData | null>(null);
  const [undoStack, setUndoStack] = useState<DrawingData[][]>([]);
  const [redoStack, setRedoStack] = useState<DrawingData[][]>([]);

  // Canvas state
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(false);

  // Collaboration state
  const [collaborators, setCollaborators] = useState<Map<string, { name: string; color: string; cursor?: { x: number; y: number } }>>(new Map());
  const [remoteDrawings, setRemoteDrawings] = useState<Map<string, DrawingData>>(new Map());

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    // Set canvas size
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;

    // Configure context
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.imageSmoothingEnabled = true;
    
    contextRef.current = context;

    // Redraw all content
    redrawCanvas();
  }, [canvasSize]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setCanvasSize({
          width: rect.width - 40, // Account for padding
          height: rect.height - 120 // Account for toolbar
        });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isActive]);

  // Listen for remote whiteboard data
  useEffect(() => {
    const handleWhiteboardData = (event: any) => {
      const { peerId, data } = event.detail;
      if (peerId === userId) return; // Ignore our own data

      handleRemoteDrawing(data);
    };

    window.addEventListener('whiteboard-data', handleWhiteboardData);
    return () => window.removeEventListener('whiteboard-data', handleWhiteboardData);
  }, [userId]);

  // Redraw canvas
  const redrawCanvas = useCallback(() => {
    const context = contextRef.current;
    if (!context) return;

    // Clear canvas
    context.clearRect(0, 0, canvasSize.width, canvasSize.height);

    // Draw grid if enabled
    if (showGrid) {
      drawGrid(context);
    }

    // Draw all completed drawings
    [...drawings, ...Array.from(remoteDrawings.values())].forEach(drawing => {
      drawPath(context, drawing);
    });

    // Draw current drawing
    if (currentDrawing) {
      drawPath(context, currentDrawing);
    }
  }, [drawings, remoteDrawings, currentDrawing, showGrid, canvasSize]);

  // Draw grid
  const drawGrid = (context: CanvasRenderingContext2D) => {
    const gridSize = 20;
    context.strokeStyle = '#e5e7eb';
    context.lineWidth = 0.5;

    for (let x = 0; x <= canvasSize.width; x += gridSize) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, canvasSize.height);
      context.stroke();
    }

    for (let y = 0; y <= canvasSize.height; y += gridSize) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(canvasSize.width, y);
      context.stroke();
    }
  };

  // Draw a path
  const drawPath = (context: CanvasRenderingContext2D, drawing: DrawingData) => {
    if (drawing.points.length === 0) return;

    context.save();
    context.strokeStyle = drawing.color;
    context.lineWidth = drawing.size;

    if (drawing.tool === 'eraser') {
      context.globalCompositeOperation = 'destination-out';
    } else {
      context.globalCompositeOperation = 'source-over';
    }

    context.beginPath();
    const firstPoint = drawing.points[0];
    context.moveTo(firstPoint.x, firstPoint.y);

    for (let i = 1; i < drawing.points.length; i++) {
      const point = drawing.points[i];
      context.lineTo(point.x, point.y);
    }

    context.stroke();
    context.restore();
  };

  // Get mouse/touch coordinates
  const getCoordinates = (event: React.MouseEvent | React.TouchEvent): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;

    return {
      x: (clientX - rect.left) / zoom - pan.x,
      y: (clientY - rect.top) / zoom - pan.y
    };
  };

  // Start drawing
  const startDrawing = (event: React.MouseEvent | React.TouchEvent) => {
    if (isReadOnly || currentTool === 'select') return;

    const coords = getCoordinates(event);
    const newDrawing: DrawingData = {
      tool: currentTool,
      points: [coords],
      color: currentColor,
      size: brushSize[0],
      timestamp: Date.now(),
      userId,
      id: `${userId}-${Date.now()}`
    };

    setCurrentDrawing(newDrawing);
    setIsDrawing(true);
  };

  // Continue drawing
  const draw = (event: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !currentDrawing) return;

    const coords = getCoordinates(event);
    const updatedDrawing = {
      ...currentDrawing,
      points: [...currentDrawing.points, coords]
    };

    setCurrentDrawing(updatedDrawing);

    // Send real-time drawing data
    if (onDataChange) {
      const whiteboardData: WhiteboardData = {
        type: 'draw',
        x: coords.x,
        y: coords.y,
        prevX: currentDrawing.points[currentDrawing.points.length - 1]?.x,
        prevY: currentDrawing.points[currentDrawing.points.length - 1]?.y,
        color: currentColor,
        size: brushSize[0],
        tool: currentTool,
        timestamp: Date.now(),
        userId
      };
      onDataChange(whiteboardData);
    }
  };

  // Stop drawing
  const stopDrawing = () => {
    if (!isDrawing || !currentDrawing) return;

    // Add to drawings and history
    const newDrawings = [...drawings, currentDrawing];
    setDrawings(newDrawings);
    setUndoStack(prev => [...prev, drawings]);
    setRedoStack([]); // Clear redo stack
    
    setCurrentDrawing(null);
    setIsDrawing(false);
  };

  // Handle remote drawing data
  const handleRemoteDrawing = (data: WhiteboardData) => {
    if (data.type === 'clear') {
      setRemoteDrawings(new Map());
      return;
    }

    if (data.type === 'draw' && data.x !== undefined && data.y !== undefined) {
      const drawingId = `${data.userId}-${Math.floor(data.timestamp / 1000)}`; // Group by second
      
      setRemoteDrawings(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(drawingId);
        
        if (existing) {
          // Add point to existing drawing
          newMap.set(drawingId, {
            ...existing,
            points: [...existing.points, { x: data.x!, y: data.y! }]
          });
        } else {
          // Create new drawing
          newMap.set(drawingId, {
            tool: data.tool || 'pen',
            points: [{ x: data.x!, y: data.y! }],
            color: data.color || '#000000',
            size: data.size || 4,
            timestamp: data.timestamp,
            userId: data.userId,
            id: drawingId
          });
        }
        
        return newMap;
      });
    }
  };

  // Undo
  const undo = () => {
    if (undoStack.length === 0) return;

    const previousState = undoStack[undoStack.length - 1];
    setRedoStack(prev => [...prev, drawings]);
    setDrawings(previousState);
    setUndoStack(prev => prev.slice(0, -1));
  };

  // Redo
  const redo = () => {
    if (redoStack.length === 0) return;

    const nextState = redoStack[redoStack.length - 1];
    setUndoStack(prev => [...prev, drawings]);
    setDrawings(nextState);
    setRedoStack(prev => prev.slice(0, -1));
  };

  // Clear canvas
  const clearCanvas = () => {
    setUndoStack(prev => [...prev, drawings]);
    setRedoStack([]);
    setDrawings([]);
    setRemoteDrawings(new Map());

    // Send clear signal
    if (onDataChange) {
      const whiteboardData: WhiteboardData = {
        type: 'clear',
        timestamp: Date.now(),
        userId
      };
      onDataChange(whiteboardData);
    }
  };

  // Save canvas
  const saveCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `whiteboard-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  // Redraw when dependencies change
  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  if (!isActive) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`fixed inset-0 bg-white dark:bg-gray-900 z-50 flex flex-col ${className}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold">Collaborative Whiteboard</h2>
            <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
              {collaborators.size + 1} collaborators
            </Badge>
          </div>
          
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center gap-4">
            {/* Tools */}
            <div className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded-lg p-1 border">
              {TOOLS.map((tool) => (
                <Button
                  key={tool.id}
                  variant={currentTool === tool.id ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setCurrentTool(tool.id)}
                  disabled={isReadOnly}
                  title={tool.name}
                >
                  <tool.icon className="h-4 w-4" />
                </Button>
              ))}
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* Colors */}
            <div className="flex items-center gap-1">
              {COLORS.slice(0, 8).map((color) => (
                <button
                  key={color}
                  onClick={() => setCurrentColor(color)}
                  disabled={isReadOnly}
                  className={`w-6 h-6 rounded border-2 transition-all ${
                    currentColor === color ? 'border-gray-900 dark:border-white scale-110' : 'border-gray-300 hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
              <Button variant="ghost" size="sm" disabled={isReadOnly}>
                <Palette className="h-4 w-4" />
              </Button>
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* Brush Size */}
            <div className="flex items-center gap-2">
              <Label className="text-sm">Size:</Label>
              <div className="w-24">
                <Slider
                  value={brushSize}
                  onValueChange={setBrushSize}
                  max={32}
                  min={1}
                  step={1}
                  disabled={isReadOnly}
                />
              </div>
              <span className="text-sm w-8 text-center">{brushSize[0]}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Actions */}
            <Button variant="outline" size="sm" onClick={undo} disabled={undoStack.length === 0 || isReadOnly}>
              <Undo className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={redo} disabled={redoStack.length === 0 || isReadOnly}>
              <Redo className="h-4 w-4" />
            </Button>
            
            <Separator orientation="vertical" className="h-6" />
            
            <Button variant="outline" size="sm" onClick={() => setShowGrid(!showGrid)}>
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={saveCanvas}>
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={clearCanvas} disabled={isReadOnly}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Canvas Container */}
        <div ref={containerRef} className="flex-1 overflow-hidden bg-gray-100 dark:bg-gray-800 relative">
          <canvas
            ref={canvasRef}
            className={`border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg ${
              TOOLS.find(t => t.id === currentTool)?.cursor === 'crosshair' ? 'cursor-crosshair' : 
              TOOLS.find(t => t.id === currentTool)?.cursor === 'text' ? 'cursor-text' : 'cursor-default'
            }`}
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0'
            }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />

          {/* Collaboration Indicators */}
          <div className="absolute bottom-4 left-4 flex flex-wrap gap-2">
            {Array.from(collaborators.entries()).map(([id, collaborator]) => (
              <Badge key={id} className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                <PenTool className="h-3 w-3 mr-1" />
                {collaborator.name}
              </Badge>
            ))}
          </div>

          {/* Zoom Controls */}
          <div className="absolute bottom-4 right-4 flex flex-col gap-2">
            <Button variant="outline" size="sm" onClick={() => setZoom(Math.min(zoom * 1.2, 3))}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setZoom(Math.max(zoom / 1.2, 0.3))}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Status Bar */}
        <div className="flex items-center justify-between p-2 text-xs text-muted-foreground bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <span>Tool: {TOOLS.find(t => t.id === currentTool)?.name}</span>
            <span>Size: {brushSize[0]}px</span>
            <span>Color: {currentColor}</span>
            <span>Zoom: {Math.round(zoom * 100)}%</span>
          </div>
          <div className="flex items-center gap-4">
            <span>{drawings.length + remoteDrawings.size} strokes</span>
            <span>{collaborators.size + 1} users online</span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}