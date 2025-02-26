<script setup>
import { ref, reactive } from 'vue';
import { NModal, NInputNumber, NSelect, NButton } from 'naive-ui';

const props = defineProps({
  isSimulating: Boolean
});

// 定义各个模块的参数
const moduleParams = reactive({
  baseband: {
    frequency: 1000,    // Hz
    amplitude: 1.0,     // V
  },
  filter: {
    type: 'lowpass',
    cutoffFreq: 2000,   // Hz
  }
});

// 控制弹窗显示
const showParamModal = ref(false);
const selectedModule = ref(null);

// 图形显示控制 - 修改为单选
const selectedPlotType = ref('time'); // 选中的图形类型
const plotOptions = [
  { label: '时域图', value: 'time' },
  { label: '功率谱密度图', value: 'psd' }
];

// 处理模块点击
const handleModuleClick = (moduleName) => {
  if (props.isSimulating) {
    // 运行时，高亮选中模块并显示其图形
    selectedModule.value = moduleName;
  } else {
    // 未运行时，显示参数设置弹窗
    selectedModule.value = moduleName;
    showParamModal.value = true;
  }
};

// 保存图片
const savePlot = () => {
  // 实现图片保存逻辑
  console.log('保存图片');
};

// 确认显示选中的图形类型
const confirmPlotType = () => {
  // 实现图形更新逻辑
  console.log('更新图形显示', selectedPlotType.value);
};
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
          <div
            class="module"
            :class="{ active: selectedModule === 'modulated' }"
            @click="handleModuleClick('modulated')"
          >
            已调信号
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
          >
            解调信号
          </div>
        </div>
      </div>
    </div>

    <!-- 下方图形显示区域 - 仅在运行时显示 -->
    <div v-if="isSimulating" class="plot-section">
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
        </div>
      </div>
      <div class="plot-display">
        <!-- 这里放置图形组件 -->
        <div class="placeholder">图形显示区域</div>
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
            :disabled="isSimulating"
          />
        </div>
        <div class="param-item">
          <span>幅度(V):</span>
          <NInputNumber
            v-model:value="moduleParams.baseband.amplitude"
            :disabled="isSimulating"
          />
        </div>
      </template>

      <!-- 滤波器参数 -->
      <template v-if="selectedModule === 'lowpass' || selectedModule === 'bandpass'">
        <div class="param-item">
          <span>截止频率(Hz):</span>
          <NInputNumber
            v-model:value="moduleParams.filter.cutoffFreq"
            :disabled="isSimulating"
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
  padding: 2px;  /* 减小内边距 */
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
}

.placeholder {
  color: #999;
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
</style>
