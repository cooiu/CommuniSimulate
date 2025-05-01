<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { EditorView } from '@codemirror/view';
import { basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { julia } from '@plutojl/lang-julia'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { executeCode, createSession, terminateSession } from '../services/api';
import PlotWindow from '../components/PlotWindow.vue';

const cells = ref([]); // 存储代码单元格
const sessionVariables = ref({}); // 存储会话变量
const isInitializing = ref(false); // 控制会话初始化状态
const initializationError = ref(''); // 初始化错误信息
const plotWindows = ref([]); // [{id, data}]
let plotWindowId = 0;

const emit = defineEmits(['trigger-next']);

// Cell类型定义
const CellType = {
  CODE: 'code',
  MARKDOWN: 'markdown'
};

// 添加默认代码
const defaultCode = `# 这是一个Julia代码示例
println("Hello, World!")`;

// 返回主页
const goBack = () => {
  emit('trigger-next', 'main');
};

// 初始化Cell编辑器
const initCells = () => {
  // 添加初始单元格
  addCell(CellType.CODE, defaultCode);
};

// 创建暗色主题
const createDarkTheme = () => {
  return EditorView.theme({
    "&": {
      backgroundColor: "#1e1e1e",
      color: "#d4d4d4",
      height: "100%"
    },
    ".cm-content": {
      caretColor: "#569cd6",
      fontFamily: "'Consolas', 'Monaco', monospace",
      fontSize: "14px",
      color: "#d4d4d4",
      padding: "8px"
    },
    ".cm-editor": {
      height: "100%",
      maxHeight: "100%"
    },
    ".cm-scroller": {
      overflow: "auto",
      maxHeight: "100%"
    },
    "&.cm-focused .cm-cursor": {
      borderLeftColor: "#569cd6"
    },
    "&.cm-focused .cm-selectionBackground, ::selection": {
      backgroundColor: "rgba(95, 95, 95, 0.5)"
    },
    ".cm-gutters": {
      backgroundColor: "#1e1e1e",
      color: "#858585",
      border: "none",
      borderRight: "1px solid #404040"
    },
    ".cm-activeLineGutter": {
      backgroundColor: "#2c2c2c"
    },
    ".cm-activeLine": {
      backgroundColor: "rgba(44, 44, 44, 0.8)"
    },
    ".cm-selectionMatch": {
      backgroundColor: "rgba(95, 95, 95, 0.3)"
    },
    ".cm-matchingBracket": {
      backgroundColor: "#3b3b3b",
      color: "#d4d4d4 !important"
    },
    ".cm-lineNumbers": {
      color: "#858585"
    }
  }, {dark: true});
};

// Julia 语法高亮样式
const createJuliaHighlightStyle = () => {
  return HighlightStyle.define([
    {tag: tags.keyword, color: "#C586C0"},
    {tag: tags.operator, color: "#d4d4d4"},
    {tag: tags.number, color: "#4EC9B0"},
    {tag: tags.string, color: "#ce9178"},
    {tag: tags.comment, color: "#6a9955", fontStyle: "italic"},
    {tag: tags.function(tags.variableName), color: "#dcdcaa"},
    {tag: tags.variableName, color: "#9cdcfe"},
    {tag: tags.typeName, color: "#4ec9b0"},
    {tag: tags.invalid, color: "#F44747"}
  ]);
};

// 添加新的单元格
const addCell = (type, content = '') => {
  const id = Date.now().toString();
  cells.value.push({
    id,
    type,
    content,
    editor: null,
    output: '',
    plots: [],
    isExecuting: false
  });

  // 等待DOM更新后初始化编辑器
  nextTick(() => {
    initCellEditor(id, content);
  });
};

// 初始化单元格编辑器
const initCellEditor = (cellId, content) => {
  // 确保DOM已经更新，延迟一点执行
  setTimeout(() => {
    const container = document.getElementById(`cell-editor-${cellId}`);
    if (!container) {
      console.error(`找不到容器: cell-editor-${cellId}`);
      return;
    }
    const darkTheme = createDarkTheme();
    const juliaHighlightStyle = createJuliaHighlightStyle();

    try {
      const state = EditorState.create({
        doc: content,
        extensions: [
          basicSetup,
          julia(),
          darkTheme,
          syntaxHighlighting(juliaHighlightStyle),
          EditorView.lineWrapping
        ]
      });

      const cellEditor = new EditorView({
        state,
        parent: container
      });

      // 更新单元格编辑器引用
      const cellIndex = cells.value.findIndex(cell => cell.id === cellId);
      if (cellIndex !== -1) {
        cells.value[cellIndex].editor = cellEditor;
      }

      console.log(`单元格 ${cellId} 编辑器初始化成功`);
    } catch (error) {
      console.error(`单元格 ${cellId} 编辑器初始化失败:`, error);
    }
  }, 50); // 添加50ms延迟确保DOM已完全渲染
};

// 初始化会话
const initSession = async () => {
  try {
    isInitializing.value = true;
    initializationError.value = '';
    await createSession();
    console.log('会话初始化成功');
    isInitializing.value = false;

    // 会话初始化成功后再初始化单元格
    initCells();
  } catch (error) {
    console.error('会话初始化失败:', error);
    initializationError.value = `会话初始化失败: ${error.message}`;
    isInitializing.value = false;
  }
};

// 执行单个单元格代码
const executeCell = async (cellId) => {
  const cellIndex = cells.value.findIndex(cell => cell.id === cellId);
  if (cellIndex === -1) return;

  const cell = cells.value[cellIndex];
  if (!cell.editor) return;

  try {
    // 标记为正在执行
    cell.isExecuting = true;
    cell.output = '执行中...';
    cell.plots = [];

    // 只获取当前单元格代码
    const currentCellCode = cell.editor.state.doc.toString();

    // 调用API执行代码
    const data = await executeCode(currentCellCode);

    // 清空上一次的输出
    cell.output = '';
    cell.plots = [];

    // 更新变量信息
    if (data.variables) {
      sessionVariables.value = data.variables;
    }

    // 只考虑当前单元格的输出
    let hasOutput = false;

    // 处理文本输出
    if (data.text) {
      // 文本可能是字符串或数组
      const outputText = Array.isArray(data.text) ? data.text.join('\n') : data.text;
      if (outputText && outputText.trim() !== '') {
        cell.output = outputText;
        hasOutput = true;
      }
    }

    // 处理错误输出
    if (data.error) {
      cell.output = data.error;
      hasOutput = true;
    }

    // 处理图形输出
    if (data.images && data.images.length > 0) {
      data.images.forEach(image => {
        if (image && image.data) {
          cell.plots.push({
            id: image.id,
            data: image.data,
            isSvg: true
          });
          hasOutput = true;
        }
      });
    }

    // 如果没有输出，显示空结果
    if (!hasOutput) {
      cell.output = '';
    }

  } catch (error) {
    console.error('执行错误:', error);
    cell.output = `执行错误: ${error.message}`;
  } finally {
    cell.isExecuting = false;
  }
};

// 执行所有单元格
const executeAllCells = async () => {
  for (let i = 0; i < cells.value.length; i++) {
    const cell = cells.value[i];
    if (cell.type === CellType.CODE) {
      await executeCell(cell.id);
    }
  }
};

// 在指定单元格下方添加新单元格
const addCellAfter = (cellId) => {
  const index = cells.value.findIndex(cell => cell.id === cellId);
  if (index === -1) return;

  const newCellId = Date.now().toString();
  cells.value.splice(index + 1, 0, {
    id: newCellId,
    type: CellType.CODE,
    content: '',
    editor: null,
    output: '',
    plots: [],
    isExecuting: false
  });

  // 等待DOM更新后初始化编辑器
  nextTick(() => {
    initCellEditor(newCellId, '');
  });
};

// 删除单元格
const deleteCell = (cellId) => {
  const index = cells.value.findIndex(cell => cell.id === cellId);
  if (index === -1 || cells.value.length <= 1) return; // 至少保留一个单元格

  const cell = cells.value[index];
  if (cell.editor) {
    cell.editor.destroy();
  }

  cells.value.splice(index, 1);
};

// 切换单元格类型
const toggleCellType = (cellId) => {
  const index = cells.value.findIndex(cell => cell.id === cellId);
  if (index === -1) return;

  const cell = cells.value[index];
  const newType = cell.type === CellType.CODE ? CellType.MARKDOWN : CellType.CODE;
  const content = cell.editor ? cell.editor.state.doc.toString() : '';

  // 销毁原编辑器
  if (cell.editor) {
    cell.editor.destroy();
  }

  // 更新单元格类型
  cells.value[index] = {
    ...cell,
    type: newType,
    editor: null
  };

  // 重新初始化编辑器
  nextTick(() => {
    initCellEditor(cellId, content);
  });
};

// 保存代码
const saveCode = async () => {
  try {
    // 合并所有单元格代码
    const allCode = cells.value
      .filter(cell => cell.type === CellType.CODE)
      .map(cell => cell.editor?.state.doc.toString() || '')
      .join('\n\n');

    if (!('showSaveFilePicker' in window)) {
      alert('您的浏览器不支持文件系统访问，将使用默认下载方式');
      return saveCodeFallback(allCode);
    }

    const options = {
      suggestedName: 'notebook.jl',
      types: [{
        description: 'Julia 文件',
        accept: {
          'text/plain': ['.jl'],
        },
      }],
    };

    const handle = await window.showSaveFilePicker(options);
    const writable = await handle.createWritable();
    await writable.write(allCode);
    await writable.close();

    console.log('代码已保存到本地');
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('用户取消了保存操作');
      return;
    }
    console.error('保存错误:', error);
    // 定义 allCode 变量以便在错误处理时可以使用
    const allCode = cells.value
      .filter(cell => cell.type === CellType.CODE)
      .map(cell => cell.editor?.state.doc.toString() || '')
      .join('\n\n');
    saveCodeFallback(allCode);
  }
};

// 后备保存方案
const saveCodeFallback = (code) => {
  try {
    const defaultName = 'notebook.jl';
    const fileName = prompt('请输入文件名（.jl）:', defaultName);

    if (!fileName) return;

    const finalName = fileName.endsWith('.jl') ? fileName : `${fileName}.jl`;
    const blob = new Blob([code], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = finalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    console.log('代码已保存到本地:', finalName);
  } catch (error) {
    console.error('保存错误:', error);
  }
};

const openPlotWindow = (svgData) => {
  plotWindows.value.push({
    id: ++plotWindowId,
    data: svgData
  });
};

const closePlotWindow = (id) => {
  plotWindows.value = plotWindows.value.filter(w => w.id !== id);
};

// 清除所有输出
const clearAllOutputs = () => {
  cells.value.forEach(cell => {
    cell.output = '';
    cell.plots = [];
  });
};

// 清理会话
const cleanupSession = async () => {
  try {
    await terminateSession();
    console.log('会话已终止');
  } catch (error) {
    console.error('会话终止失败:', error);
  }
};

onMounted(() => {
  // 仅在会话初始化中执行initCells
  initSession();
});

onUnmounted(() => {
  cells.value.forEach(cell => {
    if (cell.editor) {
      cell.editor.destroy();
    }
  });
  cleanupSession(); // 清理会话
});
</script>

<template>
  <div class="code-page" ref="codePage">
    <!-- 会话初始化加载中提示 -->
    <div v-if="isInitializing" class="session-initializing">
      <div class="loading-spinner"></div>
      <p>正在初始化会话，请稍候...</p>
    </div>

    <!-- 会话初始化错误提示 -->
    <div v-if="initializationError" class="session-error">
      <p>{{ initializationError }}</p>
      <button @click="initSession">重试</button>
    </div>

    <div v-if="!isInitializing && !initializationError">
      <div class="back-button-container">
        <button class="back-button" @click="goBack">
          <span class="back-icon">←</span>
          <span class="back-text">返回主页</span>
        </button>
      </div>

      <div class="page-header">
        <h1>代码编辑与执行系统</h1>
        <p class="subtitle">MWorks.sylab 通信仿真实验平台</p>
      </div>

      <div class="jupyter-layout">
        <!-- 工具栏 -->
        <div class="notebook-toolbar">
          <div class="toolbar-left">
            <button class="toolbar-btn" @click="addCell(CellType.CODE)">
              <span class="btn-icon">+</span>
              添加单元格
            </button>
            <button class="toolbar-btn save" @click="saveCode">
              <span class="btn-icon">💾</span>
              保存
            </button>
          </div>
          <div class="toolbar-right">
            <button class="toolbar-btn run-all" @click="executeAllCells">
              <span class="btn-icon">▶▶</span>
              运行所有单元格
            </button>
            <button class="toolbar-btn clear" @click="clearAllOutputs">
              <span class="btn-icon">🗑️</span>
              清除所有输出
            </button>
          </div>
        </div>

        <div class="notebook-container">
          <!-- 左侧单元格区域 -->
          <div class="cells-area">
            <div
              v-for="cell in cells"
              :key="cell.id"
              class="cell-container"
              :class="{ 'executing': cell.isExecuting }"
            >
              <!-- 单元格工具栏 -->
              <div class="cell-toolbar">
                <div class="cell-type-indicator">
                  {{ cell.type === CellType.CODE ? '代码' : '文本' }}
                </div>
                <div class="cell-controls">
                  <button class="cell-btn" @click="executeCell(cell.id)" v-if="cell.type === CellType.CODE">
                    <span class="btn-icon">▶</span>
                  </button>
                  <button class="cell-btn" @click="toggleCellType(cell.id)">
                    <span class="btn-icon">{{ cell.type === CellType.CODE ? 'M' : 'C' }}</span>
                  </button>
                  <button class="cell-btn" @click="addCellAfter(cell.id)">
                    <span class="btn-icon">+</span>
                  </button>
                  <button class="cell-btn delete" @click="deleteCell(cell.id)">
                    <span class="btn-icon">×</span>
                  </button>
                </div>
              </div>

              <!-- 编辑器容器 -->
              <div
                :id="`cell-editor-${cell.id}`"
                class="cell-editor-container"
              ></div>

              <!-- 输出区域 -->
              <div class="cell-output" v-if="cell.output || cell.plots.length > 0">
                <pre class="output-text" v-if="cell.output">{{ cell.output }}</pre>

                <!-- 图表输出 -->
                <div class="plot-container" v-if="cell.plots.length > 0">
                  <div v-for="plot in cell.plots" :key="plot.id" class="plot-item">
                    <div class="plot-controls">
                      <button class="plot-close-btn" @click="closePlotWindow(cell.id, plot.id)">×</button>
                    </div>
                    <div
                      v-if="plot.isSvg"
                      class="svg-container"
                      v-html="plot.data"
                      @click="openPlotWindow(plot.data)"
                      style="cursor:pointer;"
                    ></div>
                    <!-- 普通图片 -->
                    <img
                      v-else
                      :src="plot.data"
                      class="plot-image"
                      alt="Julia图表输出"
                      @click="openPlotWindow(plot.data)"
                      style="cursor:pointer;"
                    />
                    <!-- 使用v-html直接渲染SVG内容
                    <div v-if="plot.isSvg" class="svg-container" v-html="plot.data"></div>
                    保留原有的img标签，用于其他类型的图像
                    <img v-else :src="plot.data" class="plot-image" alt="Julia图表输出" /> -->
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <PlotWindow
      v-for="win in plotWindows"
      :key="win.id"
      :window-index="win.id"
      :plot-data="win.data"
      @close="closePlotWindow(win.id)"
    />
  </div>
</template>

<style scoped>
.code-page {
  width: 100%;
  min-height: 100vh;
  background: linear-gradient(135deg, #1e88e5 0%, #1976d2 100%);
  box-sizing: border-box;
  overflow-y: auto;
  position: relative;
  display: flex;
  flex-direction: column;
}

.page-header {
  text-align: center;
  color: white;
  margin: 20px auto 10px;
  width: 100%;
}

.page-header h1 {
  font-size: 28px;
  margin: 0;
  font-weight: 500;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.page-header .subtitle {
  font-size: 16px;
  margin-top: 8px;
  opacity: 0.9;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.jupyter-layout {
  display: flex;
  flex-direction: column;
  width: 95%;
  max-width: 1800px;
  margin: 0 auto 30px;
  height: calc(100vh - 160px);
  min-height: 500px;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.notebook-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: #f5f5f5;
  border-bottom: 1px solid #ddd;
}

.toolbar-left, .toolbar-right {
  display: flex;
  gap: 8px;
}

.toolbar-btn {
  background: #f0f0f0;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 6px 12px;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.toolbar-btn:hover {
  background: #e0e0e0;
  border-color: #ccc;
}

.toolbar-btn.save {
  background: #fff8e1;
  border-color: #ffecb3;
  color: #ff8f00;
}

.toolbar-btn.save:hover {
  background: #ffecb3;
}

.toolbar-btn.run-all {
  background: #e8f5e9;
  border-color: #c8e6c9;
  color: #2e7d32;
}

.toolbar-btn.run-all:hover {
  background: #c8e6c9;
}

.toolbar-btn.clear {
  background: #ffebee;
  border-color: #ffcdd2;
  color: #c62828;
}

.toolbar-btn.clear:hover {
  background: #ffcdd2;
}

.toolbar-btn.variables {
  background: #e3f2fd;
  border-color: #bbdefb;
  color: #1565c0;
}

.toolbar-btn.variables:hover {
  background: #bbdefb;
}

.notebook-container {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.cells-area {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.cell-container {
  margin-bottom: 16px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  overflow: hidden;
  transition: all 0.3s;
}

.cell-container.executing {
  box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.5);
}

.cell-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 8px;
  background: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
}

.cell-type-indicator {
  font-size: 12px;
  color: #666;
  background: #e0e0e0;
  padding: 2px 6px;
  border-radius: 3px;
}

.cell-controls {
  display: flex;
  gap: 4px;
}

.cell-btn {
  background: none;
  border: 1px solid #ddd;
  border-radius: 3px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.cell-btn:hover {
  background: #e0e0e0;
}

.cell-btn.delete {
  color: #c62828;
}

.cell-btn.delete:hover {
  background: #ffcdd2;
}

.cell-editor-container {
  min-height: 48px;
  border-bottom: 1px solid #f0f0f0;
  width: 100%;
  overflow: hidden; /* 防止内容溢出 */
  position: relative; /* 确保正确定位 */
}

.cell-output {
  background: #f8f8f8;
  padding: 8px 12px;
  max-height: 300px;
  overflow-y: auto;
}

.output-text {
  margin: 0;
  white-space: pre-wrap;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 14px;
  line-height: 1.5;
  color: #333;
}

.plot-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
  margin-top: 12px;
  width: 100%;
}

.plot-item {
  position: relative;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  background: white;
  min-height: 300px;
  max-height: 600px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.plot-controls {
  position: absolute;
  top: 4px;
  right: 4px;
  z-index: 10;
}

.plot-close-btn {
  background: rgba(0, 0, 0, 0.5);
  color: white;
  border: none;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.plot-close-btn:hover {
  background: rgba(0, 0, 0, 0.7);
}

.plot-image {
  width: 100%;
  max-height: 500px;
  object-fit: contain;
  display: block;
  background-color: white;
}

.back-button-container {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 1000;
}

.back-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background-color: rgba(255, 255, 255, 0.95);
  border: none;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.back-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  background-color: white;
}

.back-icon {
  font-size: 18px;
  color: #1976d2;
}

.back-text {
  font-size: 14px;
  font-weight: 500;
  color: #1976d2;
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
  transition: background 0.2s;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}

/* CodeMirror 主题覆盖 */
:deep(.cm-editor) {
  height: 100% !important;
  width: 100%;
  min-height: 48px; /* 确保编辑器有最小高度 */
}

:deep(.cm-scroller) {
  overflow: auto !important;
}

:deep(.cm-content) {
  white-space: pre-wrap;
  word-break: break-all;
  word-wrap: break-word;
  color: #d4d4d4;
}

:deep(.cm-gutters) {
  border-right: 1px solid #404040;
  background-color: #1e1e1e;
  color: #858585;
}

:deep(.cm-activeLineGutter) {
  background-color: #2c2c2c;
}

:deep(.cm-activeLine) {
  background-color: rgba(44, 44, 44, 0.8);
}

:deep(.cm-cursor) {
  border-left: 2px solid #d4d4d4;
}

:deep(.cm-selectionBackground) {
  background-color: rgba(95, 95, 95, 0.5) !important;
}

:deep(.cm-matchingBracket) {
  background-color: #3b3b3b;
  color: #d4d4d4 !important;
}

:deep(.cm-lineNumbers) {
  color: #858585;
}

/* Julia 语法高亮 */
:deep(.cm-keyword) {
  color: #C586C0;
}

:deep(.cm-operator) {
  color: #d4d4d4;
}

:deep(.cm-number) {
  color: #4EC9B0;
}

:deep(.cm-string) {
  color: #ce9178;
}

:deep(.cm-comment) {
  color: #6a9955;
}

:deep(.cm-function) {
  color: #dcdcaa;
}

:deep(.cm-variable) {
  color: #9cdcfe;
}

:deep(.cm-type) {
  color: #4ec9b0;
}

:deep(.cm-invalid) {
  color: #F44747;
  text-decoration: underline wavy #F44747;
}

.svg-container {
  width: 100%;
  height: 100%;
  min-height: 300px;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: white;
}

.svg-container :deep(svg) {
  width: 100%;
  height: 100%;
  max-height: 500px;
}

.session-initializing, .session-error {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  z-index: 2000;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 5px solid #f3f3f3;
  border-top: 5px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.session-error {
  background: rgba(220, 53, 69, 0.9);
}

.session-error button {
  margin-top: 20px;
  padding: 8px 16px;
  background: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
</style>
