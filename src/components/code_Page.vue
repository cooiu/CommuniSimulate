<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { EditorView } from '@codemirror/view';
import { basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { julia } from '@plutojl/lang-julia';
import PlotWindow from './PlotWindow.vue';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';

const result = ref('');
const plots = ref([]);
let editor = null;
const previousCode = ref(''); // 存储之前执行的代码

const emit = defineEmits(['trigger-next']);

// 添加默认代码
const defaultCode = `# 这是一个Julia代码示例
println("Hello, World!")

# 在这里编写你的代码
# 示例：生成测试数据
x = collect(0:0.1:2π)
y1 = sin.(x)
y2 = cos.(x)

println("数据已生成")

# 创建新图形
using TyPlot
figure()

# 绘制多条曲线
plot(x, y1, "b-", label="sin(x)")
plot(x, y2, "r--", label="cos(x)")

# 添加网格
grid("on")

# 添加标签
xlabel("x")
ylabel("y")

# 计算一些统计值
println("\n统计信息:")
println("sin(x) 最大值: ", maximum(y1))
println("sin(x) 最小值: ", minimum(y1))
println("cos(x) 最大值: ", maximum(y2))
println("cos(x) 最小值: ", minimum(y2))`;

// 返回主页
const goBack = () => {
  emit('trigger-next', 'main');
};

// 初始化CodeMirror编辑器
const initCodeMirror = () => {
  const container = document.getElementById('editor-container');

  const darkTheme = EditorView.theme({
    "&": {
      backgroundColor: "#1e1e1e",
      color: "#d4d4d4",
      height: "100%"
    },
    ".cm-content": {
      caretColor: "#569cd6",
      fontFamily: "'Consolas', 'Monaco', monospace",
      fontSize: "14px",
      color: "#d4d4d4"
    },
    ".cm-editor": {
      height: "100%",
      maxHeight: "100%"
    },
    ".cm-scroller": {
      height: "100%",
      overflow: "auto"
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

  // Julia 语法高亮样式
  const juliaHighlightStyle = HighlightStyle.define([
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

  try {
    const state = EditorState.create({
      doc: defaultCode,
      extensions: [
        basicSetup,
        julia(),
        darkTheme,
        syntaxHighlighting(juliaHighlightStyle),
        EditorView.lineWrapping
      ]
    });

    editor = new EditorView({
      state,
      parent: container
    });

    console.log('编辑器初始化成功');
  } catch (error) {
    console.error('编辑器初始化失败:', error);
  }
};

// 获取选中的代码
const getSelectedCode = () => {
  const selection = editor.state.selection.main;
  if (selection.empty) {
    return null;
  }
  return editor.state.sliceDoc(selection.from, selection.to);
};

// 获取选中位置之前的所有代码
const getCodeBeforeSelection = (selection) => {
  return editor.state.sliceDoc(0, selection.from);
};

// 执行选中的代码片段
const executeSelectedCode = async () => {
  const selectedCode = getSelectedCode();
  if (!selectedCode) {
    alert('请先选择要执行的代码片段');
    return;
  }

  try {
    result.value = '执行中...';
    const beforeCode = getCodeBeforeSelection(editor.state.selection.main);
    const fullCode = beforeCode + '\n' + selectedCode;
    previousCode.value = fullCode; // 保存执行的代码

    const response = await fetch('http://localhost:5000/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: fullCode,
        previous_code: previousCode.value
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // 处理文本输出
    if (data.text) {
      result.value = Array.isArray(data.text) ? data.text.join('\n') : data.text;
    }

    // 处理图形输出
    if (data.images && data.images.length > 0) {
      plots.value = data.images.map(image => ({
        id: image.id,
        data: image.data
      }));
      console.log('设置图形数据:', plots.value);
    }

  } catch (error) {
    console.error('执行错误:', error);
    result.value = `执行错误: ${error.message}`;
  }
};

// 执行全部代码
const executeAllCode = async () => {
  try {
    result.value = '执行中...';
    plots.value = [];

    const response = await fetch('http://localhost:5000/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: editor.state.doc.toString(),
        previous_code: previousCode.value
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // 处理文本输出
    if (data.text) {
      result.value = Array.isArray(data.text) ? data.text.join('\n') : data.text;
    }

    // 处理图形输出
    if (data.images && data.images.length > 0) {
      plots.value = data.images.map(image => ({
        id: image.id,
        data: image.data
      }));
      console.log('设置图形数据:', plots.value);
    }

    previousCode.value = editor.state.doc.toString(); // 更新已执行的代码

  } catch (error) {
    console.error('执行错误:', error);
    result.value = `执行错误: ${error.message}`;
  }
};

// 保存代码
const saveCode = async () => {
  try {
    const code = editor.state.doc.toString();

    if (!('showSaveFilePicker' in window)) {
      alert('您的浏览器不支持文件系统访问，将使用默认下载方式');
      return saveCodeFallback();
    }

    const options = {
      suggestedName: 'code.jl',
      types: [{
        description: 'Julia 文件',
        accept: {
          'text/plain': ['.jl'],
        },
      }],
    };

    const handle = await window.showSaveFilePicker(options);
    const writable = await handle.createWritable();
    await writable.write(code);
    await writable.close();

    console.log('代码已保存到本地');
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('用户取消了保存操作');
      return;
    }
    console.error('保存错误:', error);
    saveCodeFallback();
  }
};

// 后备保存方案
const saveCodeFallback = () => {
  try {
    const code = editor.state.doc.toString();
    const defaultName = 'code.jl';
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

// 修改关闭图形窗口的处理函数
const closePlotWindow = (id) => {
  console.log('关闭图形窗口:', id);
  plots.value = plots.value.filter(plot => plot.id !== id);
};

// 清除输出
const clearOutput = () => {
  result.value = '';
  plots.value = [];
};

onMounted(() => {
  initCodeMirror();
});

onUnmounted(() => {
  if (editor) {
    editor.destroy();
  }
});
</script>

<template>
  <div class="code-page" ref="codePage">
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

    <div class="code-layout">
      <!-- 左侧代码编辑器 -->
      <div class="editor-section">
        <div class="editor-header">
          <span class="header-title">代码编辑器</span>
          <div class="editor-controls">
            <button class="control-btn execute" @click="executeSelectedCode">
              <span class="btn-icon">▶</span>
              运行选中
            </button>
            <button class="control-btn execute-all" @click="executeAllCode">
              <span class="btn-icon">▶▶</span>
              运行全部
            </button>
            <button class="control-btn save" @click="saveCode">
              <span class="btn-icon">💾</span>
              保存
            </button>
          </div>
        </div>
        <div class="editor-container" id="editor-container"></div>
      </div>

      <!-- 右侧输出区域 -->
      <div class="output-section">
        <div class="output-header">
          <span class="header-title">执行结果</span>
          <button class="clear-btn" @click="clearOutput">清除输出</button>
        </div>
        <div class="output-container">
          <pre class="output-text" v-if="result">{{ result }}</pre>
        </div>
      </div>
    </div>

    <PlotWindow
      v-for="(plot, index) in plots"
      :key="plot.id"
      :window-index="index"
      :plot-data="plot.data"
      @close="closePlotWindow(plot.id)"
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
  margin: 20px auto;
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

.code-layout {
  display: grid;
  grid-template-columns: 4fr 2fr;
  gap: 16px;
  width: 95%;
  max-width: 1800px;
  margin: 10px auto 30px;
  height: calc(100vh - 200px);  /* 使用视口高度 */
  min-height: 500px;  /* 最小高度 */
}

.editor-section, .output-section {
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.98);
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  backdrop-filter: blur(10px);
  overflow: hidden;  /* 防止内容溢出 */
}

.editor-container {
  flex: 1;
  position: relative;
  height: 100%;
  min-height: 0;
  background-color: #1e1e1e;
  border-radius: 4px;
  overflow: hidden;
}

.output-container {
  flex: 1;
  padding: 12px;
  overflow: auto;
  height: 100%;  /* 确保容器填满剩余空间 */
  min-height: 0;  /* 允许容器在flex布局中收缩 */
  display: flex;
  flex-direction: column;
}

/* 调整Monaco编辑器的容器样式 */
#editor-container {
  width: 100%;
  height: 100%;
  min-height: 100%;
}

.editor-header, .output-header {
  padding: 12px 20px; /* 减小上下内边距 */
  border-bottom: 1px solid #e8e8e8;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(245, 247, 250, 0.95);
  border-radius: 12px 12px 0 0;
}

.header-title {
  font-size: 16px; /* 稍微减小字体大小 */
  font-weight: 500;
  color: #1565c0;
}

.editor-controls {
  display: flex;
  gap: 8px; /* 按钮之间的间距 */
  align-items: center;
}

.control-btn {
  background: #1976d2;
  color: white;
  border: none;
  padding: 6px 12px; /* 稍微减小按钮内边距 */
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  transition: all 0.3s;
}

.control-btn:hover {
  background: #1565c0;
}

.control-btn:disabled {
  background: #90caf9;
  cursor: not-allowed;
}

.control-btn.execute {
  background: #4caf50;
}

.control-btn.execute:hover {
  background: #388e3c;
}

.control-btn.save {
  background: #ff9800;
}

.control-btn.save:hover {
  background: #f57c00;
}

.control-btn.execute-all {
  background: #2196f3;
}

.control-btn.execute-all:hover {
  background: #1976d2;
}

.btn-icon {
  font-size: 14px;
}

.clear-btn {
  background: transparent;
  color: #666;
  border: 1px solid #ddd;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.clear-btn:hover {
  background: #f5f5f5;
  color: #1976d2;
  border-color: #1976d2;
}

.code-editor {
  width: 100%;
  height: 100%;
  border: none;
  background: #fafafa;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 15px;
  line-height: 1.6;
  padding: 16px;
  border-radius: 8px;
  resize: none;
}

.output-text {
  margin: 0;
  white-space: pre-wrap;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 15px;
  line-height: 1.6;
  color: #333;
}

.plot-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.plot-image {
  width: 100%;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.3s;
}

.plot-image:hover {
  transform: scale(1.02);
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

.page-hint {
  position: fixed;
  bottom: 15px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.6);
  color: white;
  padding: 10px 20px;
  border-radius: 20px;
  font-size: 14px;
  backdrop-filter: blur(5px);
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.hint-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.hint-icon {
  font-size: 16px;
  animation: bounce 1s infinite;
}

.hint-text {
  font-weight: 500;
}

.page-hint.fade-out {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
  pointer-events: none;
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
  color: var(--bupt-dark-blue);
}

.back-text {
  font-size: 14px;
  font-weight: 500;
  color: var(--bupt-dark-blue);
}

/* CodeMirror 主题覆盖 */
:deep(.cm-editor) {
  height: 100%;
  width: 100%;
}

:deep(.cm-scroller) {
  height: 100%;
  overflow: auto;
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
</style>
