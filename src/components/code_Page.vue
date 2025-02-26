<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import monaco from '../monaco-editor';
import PlotWindow from './PlotWindow.vue';

const result = ref('');
const plots = ref([]);
let editor = null;

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

// Monaco Editor 配置
const initMonaco = () => {
  const container = document.getElementById('editor-container');
  editor = monaco.editor.create(container, {
    value: defaultCode,
    language: 'julia',
    theme: 'vs-dark',
    minimap: { enabled: true },
    automaticLayout: true,
    fontSize: 14,
    lineNumbers: 'on',
    scrollBeyondLastLine: false,
  });
};

// 执行代码
const executeCode = async () => {
  try {
    result.value = '执行中...';
    plots.value = []; // 清空现有图形

    const response = await fetch('http://localhost:5000/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: editor.getValue()
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
    if (data.images && data.images.length > 0) {  // 注意这里改为 images
      plots.value = data.images.map(image => ({
        id: image.id,
        data: image.data
      }));
      console.log('设置图形数据:', plots.value); // 添加调试日志
    }

  } catch (error) {
    console.error('执行错误:', error);
    result.value = `执行错误: ${error.message}`;
  }
};

// 保存代码
const saveCode = async () => {
  try {
    const code = editor.getValue();

    // 检查浏览器是否支持 File System Access API
    if (!('showSaveFilePicker' in window)) {
      alert('您的浏览器不支持文件系统访问，将使用默认下载方式');
      return saveCodeFallback();
    }

    // 配置文件选择器选项
    const options = {
      suggestedName: 'code.jl',
      types: [{
        description: 'Julia 文件',
        accept: {
          'text/plain': ['.jl'],
        },
      }],
    };

    // 打开系统的保存文件对话框
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
    // 如果出错，使用后备方案
    saveCodeFallback();
  }
};

// 后备方案：使用传统的下载方式
const saveCodeFallback = () => {
  try {
    const code = editor.getValue();
    const defaultName = 'code.jl';

    // 提示用户输入文件名
    const fileName = prompt('请输入文件名（.jl）:', defaultName);

    if (!fileName) return; // 用户取消

    // 确保文件扩展名为 .jl
    const finalName = fileName.endsWith('.jl') ? fileName : `${fileName}.jl`;

    // 创建 Blob 对象
    const blob = new Blob([code], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);

    // 创建并触发下载
    const link = document.createElement('a');
    link.href = url;
    link.download = finalName;
    document.body.appendChild(link);
    link.click();

    // 清理
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    console.log('代码已保存到本地:', finalName);
  } catch (error) {
    console.error('保存错误:', error);
  }
};

// 修改关闭图形窗口的处理函数
const closePlotWindow = (id) => {
  console.log('关闭图形窗口:', id); // 添加调试日志
  plots.value = plots.value.filter(plot => plot.id !== id);
};

// // 添加图形缩放处理函数
// const handleScaleChange = (data) => {
//   console.log('图形缩放:', data);
// };

onMounted(() => {
  initMonaco();

  const handleResize = () => {
    if (editor) {
      editor.layout();
    }
  };
  window.addEventListener('resize', handleResize);

  onUnmounted(() => {
    window.removeEventListener('resize', handleResize);
    if (editor) {
      editor.dispose();
    }
  });
});

// 添加清除输出功能
const clearOutput = () => {
  result.value = '';
  plots.value = [];
};

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
            <button class="control-btn execute" @click="executeCode">
              <span class="btn-icon">▶</span>
              运行
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

    <!-- 图形窗口 -->
    <PlotWindow
      v-for="plot in plots"
      :key="plot.id"
      :window-index="plot.id"
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
  height: calc(100vh - 200px);  /* 使用视口高度计算 */
  min-height: 500px;  /* 设置最小高度 */
}

.editor-section, .output-section {
  width: 100%;
  height: 100%;  /* 确保占满父容器高度 */
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
  position: relative;  /* 为Monaco编辑器提供定位上下文 */
  height: 100%;  /* 确保容器填满剩余空间 */
  min-height: 0;  /* 允许容器在flex布局中收缩 */
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
  height: 100% !important;  /* 强制高度100% */
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
  background: #4caf50; /* 绿色 */
}

.control-btn.execute:hover {
  background: #388e3c;
}

.control-btn.save {
  background: #ff9800; /* 橙色 */
}

.control-btn.save:hover {
  background: #f57c00;
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
  background: rgba(0, 0, 0, 0.6); /* 改为灰色半透明背景 */
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
</style>
