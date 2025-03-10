<script setup>
import { ref, reactive, watch } from 'vue';
import { NModal, NInputNumber, NSelect, NButton, NSpin } from 'naive-ui';
import Chart from 'chart.js/auto';
import zoomPlugin from 'chartjs-plugin-zoom';

// 注册缩放插件
Chart.register(zoomPlugin);

const props = defineProps({
  isSimulating: Boolean
});

const emit = defineEmits(['run-simulation', 'stop-simulation']);

// 定义各个模块的参数
const moduleParams = reactive({
  baseband: {
    frequency: 1000,    // Hz
    amplitude: 1.0,     // V
    phaseoffset:0,
  },
  multiplier: {
    frequency: 1000,    // Hz
    amplitude: 1.0,     // V
    phaseoffset:0,
  },
  channel: {
    PSD: 1000,    // w/Hz
    amplitude: 1.0,     // V
  },
  bandpass: {
    upFrequency: 2000,    // Hz
    downFrequency: 1000,    // Hz
  },
  demodulator: {
    frequency: 1000,    // Hz
    amplitude: 1.0,     // V
    phaseoffset:0,
  },
  lowpass: {
    cutoffFreq: 2000,
  }
});

// 定义信号数据
const signalData = ref([]);

// 控制弹窗显示
const showParamModal = ref(false);
const selectedModule = ref(null);

// 加载状态
const isLoading = ref(false);
const loadStartTime = ref(0);
const loadTime = ref(0);

// 图形显示控制 - 修改为单选
const selectedPlotType = ref('time'); // 选中的图形类型
const plotOptions = [
  { label: '时域图', value: 'time' },
  { label: '功率谱密度图', value: 'psd' }
];

// 图表变量
let timeChart = null;
let freqChart = null;

// 处理模块点击
const handleModuleClick = (moduleName) => {
  if (props.isSimulating) {
    // 运行时，高亮选中模块并显示其图形
    selectedModule.value = moduleName;
    updateCharts();
  } else {
    // 未运行时，显示参数设置弹窗
    selectedModule.value = moduleName;
    showParamModal.value = true;
  }
};

// 模块名称映射
const moduleNameMap = {
  'baseband': 'base_signal',
  'multiplier': 'modulated_signal',
  'channel': 'transmitted_signal',
  'bandpass': 'filtered_signal',
  'demodulator': 'demodulated_signal',
  'lowpass': 'recovered_signal',
  'recovered': 'recovered_signal'  // 添加解调信号的映射
};

// 更新图表显示
const updateCharts = () => {
  if (!props.isSimulating || !selectedModule.value || signalData.value.length === 0) return;

  const moduleName = moduleNameMap[selectedModule.value];
  const moduleData = signalData.value.find(item => item.name === moduleName);

  if (!moduleData) return;

  updateTimeChart(moduleData);
  updateFreqChart(moduleData);
};

// 更新时域图
const updateTimeChart = (moduleData) => {
  if (!timeChart) {
    initTimeChart(moduleData);
    return;
  }

  // 获取时间点 (t = 0:1/Samplerate:1)
  const sampleRate = Math.max(moduleParams.baseband.frequency, moduleParams.multiplier.frequency) * 10;
  const timePoints = Array.from({length: moduleData.time_signal.length}, (_, i) => i / sampleRate);

  timeChart.data.labels = timePoints;
  timeChart.data.datasets[0].data = moduleData.time_signal;
  timeChart.data.datasets[0].label = `${selectedModule.value} (时域)`;
  timeChart.update();
};

// 更新频域图
const updateFreqChart = (moduleData) => {
  if (!freqChart) {
    initFreqChart(moduleData);
    return;
  }

  freqChart.data.labels = moduleData.freq;
  freqChart.data.datasets[0].data = moduleData.freq_magnitude;
  freqChart.data.datasets[0].label = `${selectedModule.value} (频域)`;
  freqChart.update();
};

// 初始化时域图
const initTimeChart = (moduleData) => {
  const ctx = document.getElementById('timeChart');
  if (!ctx) return;

  // 获取时间点 (t = 0:1/Samplerate:1)
  const sampleRate = Math.max(moduleParams.baseband.frequency, moduleParams.multiplier.frequency) * 10;
  const timePoints = Array.from({length: moduleData.time_signal.length}, (_, i) => i / sampleRate);

  timeChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: timePoints,
      datasets: [{
        label: `${selectedModule.value} (时域)`,
        data: moduleData.time_signal,
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1,
        pointRadius: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          title: {
            display: true,
            text: '时间 (s)'
          },
          ticks: {
            callback: function(value) {
              return Number(value).toFixed(2);
            }
          }
        },
        y: {
          title: {
            display: true,
            text: '幅度'
          },
          ticks: {
            callback: function(value) {
              return Number(value).toFixed(2);
            }
          }
        }
      },
      plugins: {
        zoom: {
          pan: {
            enabled: true,
            mode: 'xy'
          },
          zoom: {
            wheel: {
              enabled: true,
            },
            pinch: {
              enabled: true
            },
            mode: 'xy'
          }
        }
      }
    }
  });
};

// 初始化频域图
const initFreqChart = (moduleData) => {
  const ctx = document.getElementById('freqChart');
  if (!ctx) return;

  freqChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: moduleData.freq,
      datasets: [{
        label: `${selectedModule.value} (频域)`,
        data: moduleData.freq_magnitude,
        borderColor: 'rgb(153, 102, 255)',
        tension: 0.1,
        pointRadius: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          title: {
            display: true,
            text: '频率 (Hz)'
          },
          ticks: {
            callback: function(value) {
              return Number(value).toFixed(2);
            }
          }
        },
        y: {
          title: {
            display: true,
            text: '幅度'
          },
          ticks: {
            callback: function(value) {
              return Number(value).toFixed(2);
            }
          }
        }
      },
      plugins: {
        zoom: {
          pan: {
            enabled: true,
            mode: 'xy'
          },
          zoom: {
            wheel: {
              enabled: true,
            },
            pinch: {
              enabled: true
            },
            mode: 'xy'
          }
        }
      }
    }
  });
};

// 设置信号数据
const setSignalData = (data) => {
  signalData.value = data;
  if (selectedModule.value) {
    updateCharts();
  }
};

// 保存图片
const savePlot = () => {
  const chart = selectedPlotType.value === 'time' ? timeChart : freqChart;
  if (!chart) return;

  // 创建一个链接并触发下载
  const link = document.createElement('a');
  link.download = `${selectedModule.value}_${selectedPlotType.value}.png`;
  link.href = chart.toBase64Image();
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// 确认显示选中的图形类型
const confirmPlotType = () => {
  // 实现图形更新逻辑
  console.log('更新图形显示', selectedPlotType.value);
  // 图表已经绘制，这里只需要控制显示/隐藏
  const timeChartElement = document.getElementById('timeChartContainer');
  const freqChartElement = document.getElementById('freqChartContainer');

  if (selectedPlotType.value === 'time') {
    timeChartElement.style.display = 'block';
    freqChartElement.style.display = 'none';
  } else {
    timeChartElement.style.display = 'none';
    freqChartElement.style.display = 'block';
  }
};

// 更新父组件数据
const updateParentData = (responseData) => {
  if (responseData && responseData.data && Array.isArray(responseData.data)) {
    loadTime.value = ((Date.now() - loadStartTime.value) / 1000).toFixed(2);
    isLoading.value = false; // 数据加载完成后，关闭加载动画
    setSignalData(responseData.data);
    // 默认选择基带信号显示
    handleModuleClick('baseband');
  }
};

// 开始加载动画
const startLoading = () => {
  isLoading.value = true;
  loadStartTime.value = Date.now();
};

// 释放数据
const releaseData = () => {
  signalData.value = [];
  if (timeChart) {
    timeChart.destroy();
    timeChart = null;
  }
  if (freqChart) {
    freqChart.destroy();
    freqChart = null;
  }
  selectedModule.value = null;
};

// 处理仿真按钮点击
const handleSimulationToggle = () => {
  if (props.isSimulating) {
    // 当前是正在仿真状态，点击停止仿真
    emit('stop-simulation');
    releaseData();
  } else {
    // 当前未仿真，点击开始仿真
    startLoading(); // 开始加载动画
    emit('run-simulation');
  }
};

// 重置缩放
const resetZoom = () => {
  const chart = selectedPlotType.value === 'time' ? timeChart : freqChart;
  if (chart) {
    chart.resetZoom();
  }
};

// 暴露方法给父组件
defineExpose({
  moduleParams,
  updateParentData,
  handleModuleClick,
  startLoading
});

// 监视仿真状态
watch(() => props.isSimulating, (newVal) => {
  if (!newVal) {
    // 仿真结束，清除图表
    isLoading.value = false;
    if (timeChart) {
      timeChart.destroy();
      timeChart = null;
    }
    if (freqChart) {
      freqChart.destroy();
      freqChart = null;
    }
  }
});
</script>

<template>
<div class="dsb-modem-container">
    <!-- DSB框图部分 -->
    <div class="dsb-modem" :class="{ 'with-plot': isSimulating }">
      <div class="diagram">
        <!-- 第一行：从左到右 -->
        <div class="signal-flow first-row">
          <div
            class="module"
            :class="{ active: selectedModule === 'baseband' }"
            @click="handleModuleClick('baseband')"
          >
            基带信号
          </div>
          <div class="arrow">→</div>
          <div
            class="module"
            :class="{ active: selectedModule === 'multiplier' }"
            @click="handleModuleClick('multiplier')"
          >
            乘法器
          </div>
          <div class="arrow">→</div>
          <div class="channel-container">
            <div
              class="module"
              :class="{ active: selectedModule === 'channel' }"
              @click="handleModuleClick('channel')"
            >
              信道
            </div>
            <div class="arrow down">↓</div>
          </div>
        </div>

        <!-- 第二行：从右到左 -->
        <div class="signal-flow reverse">
          <div
            class="module"
            :class="{ active: selectedModule === 'bandpass' }"
            @click="handleModuleClick('bandpass')"
          >
            带通滤波
          </div>
          <div class="arrow">←</div>
          <div
            class="module"
            :class="{ active: selectedModule === 'demodulator' }"
            @click="handleModuleClick('demodulator')"
          >
            乘法器
          </div>
          <div class="arrow">←</div>
          <div
            class="module"
            :class="{ active: selectedModule === 'lowpass' }"
            @click="handleModuleClick('lowpass')"
          >
            低通滤波
          </div>
          <div class="arrow">←</div>
          <div
            class="module"
            :class="{ active: selectedModule === 'recovered' }"
            @click="handleModuleClick('recovered')"
          >
            解调信号
          </div>
        </div>
      </div>
    </div>

    <!-- 运行/停止仿真按钮 -->
    <div class="run-button-container">
      <NButton
        @click="handleSimulationToggle"
        :type="props.isSimulating ? 'error' : 'primary'"
      >
        {{ props.isSimulating ? '停止仿真' : '运行仿真' }}
      </NButton>
    </div>

    <!-- 下方图形显示区域 - 仅在运行时显示 -->
    <div v-if="props.isSimulating" class="plot-section">
      <!-- 加载动画 -->
      <NSpin v-if="isLoading" class="loading-spinner" size="large">
        <template #description>
          <span class="loading-text">加载中...</span>
        </template>
      </NSpin>

      <div v-else>
        <div class="plot-controls">
          <div class="plot-select">
            <NSelect
              v-model:value="selectedPlotType"
              :options="plotOptions"
              size="small"
              style="width: 140px"
            />
          </div>
          <div class="plot-buttons">
            <NButton size="small" type="primary" @click="confirmPlotType">确认</NButton>
            <NButton size="small" @click="savePlot">保存</NButton>
            <NButton size="small" @click="resetZoom">重置缩放</NButton>
          </div>
          <div class="load-time">加载耗时: {{ loadTime }}s</div>
        </div>
        <div class="plot-display">
          <!-- 图表显示区域 -->
          <div id="timeChartContainer" class="chart-container" :style="{ display: selectedPlotType === 'time' ? 'block' : 'none' }">
            <canvas id="timeChart"></canvas>
          </div>
          <div id="freqChartContainer" class="chart-container" :style="{ display: selectedPlotType === 'psd' ? 'block' : 'none' }">
            <canvas id="freqChart"></canvas>
          </div>
        </div>
      </div>
    </div>

    <!-- 参数设置弹窗 -->
    <NModal v-model:show="showParamModal" preset="card" style="width: 400px">
      <template #header>
        {{ selectedModule }} 参数设置
      </template>

      <!-- 基带信号参数 -->
      <template v-if="selectedModule === 'baseband'">
        <div class="param-item">
          <span>频率(Hz):</span>
          <NInputNumber
            v-model:value="moduleParams.baseband.frequency"
            :disabled="props.isSimulating"
          />
        </div>
        <div class="param-item">
          <span>幅度(V):</span>
          <NInputNumber
            v-model:value="moduleParams.baseband.amplitude"
            :disabled="props.isSimulating"
          />
        </div>
        <div class="param-item">
          <span>相位(rad):</span>
          <NInputNumber
            v-model:value="moduleParams.baseband.phaseoffset"
            :disabled="props.isSimulating"
          />
        </div>
      </template>

      <!-- 调制乘法器 -->
      <template v-if="selectedModule === 'multiplier'">
        <div class="param-item">
          <span>频率(Hz):</span>
          <NInputNumber
            v-model:value="moduleParams.multiplier.frequency"
            :disabled="props.isSimulating"
          />
        </div>
        <div class="param-item">
          <span>幅度(V):</span>
          <NInputNumber
            v-model:value="moduleParams.multiplier.amplitude"
            :disabled="props.isSimulating"
          />
        </div>
        <div class="param-item">
          <span>相位:</span>
          <NInputNumber
            v-model:value="moduleParams.multiplier.phaseoffset"
            :disabled="props.isSimulating"
          />
        </div>
      </template>

      <!-- 信道 -->
      <template v-if="selectedModule === 'channel'">
        <div class="param-item">
          <span>功率谱密度(w/Hz):</span>
          <NInputNumber
            v-model:value="moduleParams.channel.PSD"
            :disabled="props.isSimulating"
          />
        </div>
        <div class="param-item">
          <span>幅度(V):</span>
          <NInputNumber
            v-model:value="moduleParams.channel.amplitude"
            :disabled="props.isSimulating"
          />
        </div>
      </template>

      <!-- 带通滤波器 -->
      <template v-if="selectedModule === 'bandpass'">
        <div class="param-item">
          <span>上频率(Hz):</span>
          <NInputNumber
            v-model:value="moduleParams.bandpass.upFrequency"
            :disabled="props.isSimulating"
          />
        </div>
        <div class="param-item">
          <span>下频率(Hz):</span>
          <NInputNumber
            v-model:value="moduleParams.bandpass.downFrequency"
            :disabled="props.isSimulating"
          />
        </div>
      </template>

      <!-- 解调乘法器 -->
      <template v-if="selectedModule === 'demodulator'">
        <div class="param-item">
          <span>频率(Hz):</span>
          <NInputNumber
            v-model:value="moduleParams.demodulator.frequency"
            :disabled="props.isSimulating"
          />
        </div>
        <div class="param-item">
          <span>幅度(V):</span>
          <NInputNumber
            v-model:value="moduleParams.demodulator.amplitude"
            :disabled="props.isSimulating"
          />
        </div>
        <div class="param-item">
          <span>相位:</span>
          <NInputNumber
            v-model:value="moduleParams.demodulator.phaseoffset"
            :disabled="props.isSimulating"
          />
        </div>
      </template>

      <!-- 低通滤波器 -->
      <template v-if="selectedModule === 'lowpass'">
        <div class="param-item">
          <span>截止频率(Hz):</span>
          <NInputNumber
            v-model:value="moduleParams.lowpass.cutoffFreq"
            :disabled="props.isSimulating"
          />
        </div>
      </template>
    </NModal>
</div>
</template>

<style scoped>
.dsb-modem-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 10px;
  height: 100%;
}

.dsb-modem {
  width: 100%;
  transition: all 0.3s ease;
  margin-bottom: 30px;  /* 增加底部间距 */
}

.diagram {
  padding: 2px;
}

.modulation-section {
  border: 1px solid #ddd;
  padding: 12px;
  border-radius: 8px;
  margin-top: -50px;  /* 向上移动整个框图 */
}

.plot-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  min-height: 400px;  /* 增加图形显示区域的最小高度 */
  position: relative;
}

.run-button-container {
  display: flex;
  justify-content: center;
  margin: 10px 0;
}

.loading-spinner {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 100;
}

.loading-text {
  margin-top: 8px;
  font-size: 14px;
  color: #1890ff;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 调整模块大小 */
.module {
  padding: 8px 12px;
  font-size: 12px;  /* 更小的字体 */
  border: 1.5px solid #333;  /* 更细的边框 */
  width: 70px;  /* 固定宽度 */
  text-align: center;  /* 文字居中 */
  white-space: nowrap;  /* 防止文字换行 */
  color: #000000;  /* 黑色字体 */
  height: 35px;  /* 固定高度 */
  display: flex;  /* 使用flex布局 */
  align-items: center;  /* 垂直居中 */
  justify-content: center;  /* 水平居中 */
}

/* 调整箭头大小和间距 */
.arrow {
  font-size: 14px;
  margin: 0 2px;
  color: #000000;  /* 黑色箭头 */
}

.signal-flow {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 5px 0;  /* 减小上下间距 */
  justify-content: center;
}

.signal-flow.reverse {
  flex-direction: row-reverse;
  margin-right: 100px;
}

.plot-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}

.plot-select {
  flex: 1;
  margin-right: 16px;
}

.plot-buttons {
  display: flex;
  gap: 8px;
}

.plot-display {
  flex: 1;
  background-color: #f5f5f5;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  position: relative;
}

.chart-container {
  width: 100%;
  height: 350px;  /* 增加图表高度 */
  position: relative;  /* 改为相对定位 */
  margin-top: 20px;
}

.modulation-section h3 {
  font-size: 13px;
  margin-bottom: 8px;
  text-align: center;
  color: #000000;
  font-weight: 500;
}

.module {
  padding: 10px 15px;
  border: 2px solid #333;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
  background-color: white;
}

.module:hover {
  background-color: #f0f0f0;
  transform: scale(1.05);
}

.module.active {
  border-color: #18a058;
  background-color: #e6f7ff;
}

.param-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

:deep(.n-card-header) {
  font-weight: bold;
}

.channel-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 30px;  /* 向上移动以对齐其他模块 */
}

.arrow.down {
  color: #000000;
  font-size: 14px;
  margin-top: 5px;  /* 调整箭头与信道模块的间距 */
}

.load-time {
  font-size: 12px;
  color: #666;
  margin-left: 16px;
}
</style>
