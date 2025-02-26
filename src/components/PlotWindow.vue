<script setup>
import { ref, computed, onMounted } from 'vue';

const props = defineProps({
  windowIndex: {
    type: Number,
    required: true
  },
  plotData: {
    type: String, // SVG字符串
    required: true
  }
});

const emit = defineEmits(['close', 'scale-change']);

// 窗口状态
const position = ref({ x: 100 + props.windowIndex * 30, y: 100 + props.windowIndex * 30 });
const size = ref({ width: 600, height: 500 });
const isMaximized = ref(false);
const isMinimized = ref(false);
const scale = ref(1);
const panPosition = ref({ x: 0, y: 0 });

// 缩放步长
const ZOOM_STEP = 0.1;
const MAX_SCALE = 5;
const MIN_SCALE = 0.1;

// 拖拽相关
const isDragging = ref(false);
const dragOffset = ref({ x: 0, y: 0 });

// 平移相关
const isPanning = ref(false);
const panStart = ref({ x: 0, y: 0 });

// 计算样式
const windowStyle = computed(() => ({
  left: `${position.value.x}px`,
  top: `${position.value.y}px`,
  width: isMaximized.value ? '100%' : `${size.value.width}px`,
  height: isMaximized.value ? '100%' : `${size.value.height}px`,
  position: 'fixed',
  zIndex: 1000,
  backgroundColor: '#ffffff',
  border: '1px solid #ccc',
  borderRadius: '4px',
  boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column'
}));

// 处理拖拽
const startDrag = (event) => {
  if (event.target.tagName.toLowerCase() === 'button') return;
  isDragging.value = true;
  dragOffset.value = {
    x: event.clientX - position.value.x,
    y: event.clientY - position.value.y
  };
  document.addEventListener('mousemove', handleDrag);
  document.addEventListener('mouseup', stopDrag);
};

const handleDrag = (event) => {
  if (!isDragging.value) return;
  position.value = {
    x: event.clientX - dragOffset.value.x,
    y: event.clientY - dragOffset.value.y
  };
};

const stopDrag = () => {
  isDragging.value = false;
  document.removeEventListener('mousemove', handleDrag);
  document.removeEventListener('mouseup', stopDrag);
};

// 处理缩放
const handleZoomIn = () => {
  scale.value = Math.min(MAX_SCALE, scale.value + ZOOM_STEP);
  emitScaleChange();
};

const handleZoomOut = () => {
  scale.value = Math.max(MIN_SCALE, scale.value - ZOOM_STEP);
  emitScaleChange();
};

const handleZoom = (event) => {
  event.preventDefault();
  const delta = event.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
  scale.value = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale.value + delta));
  emitScaleChange();
};

// 重置缩放
const resetScale = () => {
  scale.value = 1;
  emitScaleChange();
};

const emitScaleChange = () => {
  emit('scale-change', {
    windowIndex: props.windowIndex,
    scale: scale.value
  });
};

// 最小化
const minimize = () => {
  isMinimized.value = !isMinimized.value;
  if (isMinimized.value) {
    isMaximized.value = false;
  }
};

// 最大化/还原
const toggleMaximize = () => {
  isMaximized.value = !isMaximized.value;
  if (isMaximized.value) {
    isMinimized.value = false;
  }
};

// 平移处理函数
const startPan = (e) => {
  if (e.button === 0) { // 只响应左键
    isPanning.value = true;
    panStart.value = {
      x: e.clientX - panPosition.value.x,
      y: e.clientY - panPosition.value.y
    };
  }
};

const handlePan = (e) => {
  if (isPanning.value) {
    panPosition.value = {
      x: e.clientX - panStart.value.x,
      y: e.clientY - panStart.value.y
    };
  }
};

const stopPan = () => {
  isPanning.value = false;
};

// 计算初始缩放比例
onMounted(() => {
  const container = document.querySelector(`.plot-window-${props.windowIndex} .svg-container`);
  const svg = container?.querySelector('svg');

  if (container && svg) {
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const svgWidth = svg.clientWidth;
    const svgHeight = svg.clientHeight;

    if (svgWidth && svgHeight) {
      const scaleX = containerWidth / svgWidth;
      const scaleY = containerHeight / svgHeight;
      scale.value = Math.min(scaleX, scaleY) * 0.9;

      emit('scale-change', {
        windowIndex: props.windowIndex,
        scale: scale.value
      });
    }
  }
});

// 保存处理函数
const handleSave = async () => {
  try {
    // 检查浏览器是否支持 File System Access API
    if (!('showSaveFilePicker' in window)) {
      alert('您的浏览器不支持文件系统访问，将使用默认下载方式');
      return saveFallback();
    }

    // 配置文件选择器选项
    const options = {
      suggestedName: `plot-${props.windowIndex}.png`,
      types: [{
        description: '图片文件',
        accept: {
          'image/png': ['.png'],
          'image/svg+xml': ['.svg']
        },
      }],
    };

    // 打开系统的保存文件对话框
    const handle = await window.showSaveFilePicker(options);
    const writable = await handle.createWritable();

    // 根据文件扩展名决定保存格式
    const fileName = handle.name;
    if (fileName.endsWith('.png')) {
      // 转换 SVG 为 PNG
      const png = await convertSvgToPng(props.plotData);
      await writable.write(png);
    } else {
      // 保存为 SVG
      await writable.write(props.plotData);
    }
    await writable.close();

    console.log('图形已保存到本地');
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('用户取消了保存操作');
      return;
    }
    console.error('保存错误:', error);
    // 如果出错，使用后备方案
    saveFallback();
  }
};

// SVG 转 PNG 函数
const convertSvgToPng = (svgString) => {
  return new Promise((resolve, reject) => {
    try {
      // 创建 SVG Blob
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const URL = window.URL || window.webkitURL || window;
      const svgUrl = URL.createObjectURL(svgBlob);

      // 创建 Image 对象
      const img = new Image();
      img.onload = () => {
        try {
          // 创建 canvas
          const canvas = document.createElement('canvas');
          const scale = 2; // 提高分辨率
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;

          // 绘制图像
          const ctx = canvas.getContext('2d');
          ctx.scale(scale, scale);
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);

          // 转换为 PNG
          canvas.toBlob((blob) => {
            URL.revokeObjectURL(svgUrl);
            resolve(blob);
          }, 'image/png');
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(svgUrl);
        reject(new Error('图像加载失败'));
      };
      img.src = svgUrl;
    } catch (err) {
      reject(err);
    }
  });
};

// 后备方案：使用传统的下载方式
const saveFallback = async () => {
  try {
    const defaultName = `plot-${props.windowIndex}`;
    const fileName = prompt('请输入文件名（不含扩展名）:', defaultName);
    if (!fileName) return;

    const format = prompt('请选择保存格式（输入 1 为 PNG，输入 2 为 SVG）:', '1');
    const isPng = format === '1';
    const finalName = `${fileName}.${isPng ? 'png' : 'svg'}`;

    let blob;
    if (isPng) {
      blob = await convertSvgToPng(props.plotData);
    } else {
      blob = new Blob([props.plotData], { type: 'image/svg+xml' });
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = finalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log('图形已保存到本地:', finalName);
  } catch (error) {
    console.error('保存错误:', error);
    alert('保存失败');
  }
};
</script>

<template>
  <div
    :class="['plot-window', { minimized: isMinimized }]"
    :style="windowStyle"
  >
    <!-- 标题栏 -->
    <div
      class="title-bar"
      @mousedown="startDrag"
      @mousemove="handleDrag"
      @mouseup="stopDrag"
      @mouseleave="stopDrag"
    >
      <span>图形 #{{ windowIndex }}</span>
      <div class="window-controls">
        <button @click="minimize" title="最小化">─</button>
        <button @click="toggleMaximize" title="最大化">□</button>
        <button @click="$emit('close')" title="关闭">×</button>
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-group">
        <button class="save-btn" @click="handleSave" title="保存"></button>
        <button class="zoom-in-btn" @click="handleZoomIn" title="放大"></button>
        <button class="zoom-out-btn" @click="handleZoomOut" title="缩小"></button>
        <button class="reset-btn" @click="resetScale" title="重置"></button>
      </div>
    </div>

    <!-- SVG容器 -->
    <div
      class="svg-container"
      @wheel="handleZoom"
      @mousedown="startPan"
      @mousemove="handlePan"
      @mouseup="stopPan"
      @mouseleave="stopPan"
    >
      <div
        class="svg-wrapper"
        v-html="plotData"
        :style="{
          transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${scale})`,
        }"
      ></div>
    </div>
  </div>
</template>

<style scoped>
.plot-window {
  position: fixed;
  background: #ffffff;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  display: flex;
  flex-direction: column;
  z-index: 1000;
  transition: height 0.3s;
}

.title-bar {
  background: #2c3e50;
  color: white;
  padding: 4px 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: move;
  user-select: none;
  height: 30px;
  flex-shrink: 0;
}

.window-controls {
  display: flex;
  gap: 4px;
}

.window-controls button {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 0 6px;
}

.window-controls button:hover {
  background: rgba(255,255,255,0.1);
}

.toolbar {
  padding: 4px;
  border-bottom: 1px solid #eee;
  height: 30px;
  flex-shrink: 0;
  display: flex;
  gap: 4px;
  align-items: center;
}

.svg-container {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: #ffffff;
  cursor: grab;
}

.svg-container:active {
  cursor: grabbing;
}

.svg-wrapper {
  position: absolute;
  transform-origin: center;
  transition: transform 0.1s;
}

.toolbar button {
  width: 32px;
  height: 32px;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  cursor: pointer;
  background-color: #f8f9fa;
  background-size: 20px 20px;
  background-position: center;
  background-repeat: no-repeat;
}

.toolbar button:hover {
  background-color: #e9ecef;
}

.save-btn {
  background-image: url('@/assets/save.png');
}

.zoom-in-btn {
  background-image: url('@/assets/bigger.png');
}

.zoom-out-btn {
  background-image: url('@/assets/small.png');
}

.reset-btn {
  background-image: url('@/assets/restore.png');
}

.save-menu {
  position: absolute;
  background: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  z-index: 1001;
}

.menu-item {
  padding: 8px 16px;
  cursor: pointer;
}

.menu-item:hover {
  background: #f0f0f0;
}

.toolbar-group {
  display: flex;
  gap: 4px;
}

.window-controls button {
  padding: 0 8px;
  font-size: 14px;
}

/* 最小化状态 */
.plot-window.minimized {
  height: 30px !important;
  overflow: hidden;
}

/* 最大化状态 */
.plot-window.maximized {
  width: 100% !important;
  height: 100% !important;
  left: 0 !important;
  top: 0 !important;
}
</style>
