<script setup>
import { ref } from 'vue';
import DSBSystem from './DSB_Modem.vue';
import { NButton } from 'naive-ui';

const selectedSystem = ref('');
const isSimulationVisible = ref(false);
const isSimulating = ref(false);
const emit = defineEmits(['trigger-next']);

// 选择系统
const selectSystem = (system) => {
  selectedSystem.value = system;
  isSimulationVisible.value = true;
};

// 返回主页
const goBack = () => {
  emit('trigger-next', 'main');
};

// 运行仿真
const runSimulation = async () => {
  if (!selectedSystem.value) return;

  try {
    isSimulating.value = true;
    // 调用后端API
    const response = await fetch('/api/simulate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        system: selectedSystem.value,
        // 其他参数...
      })
    });
    const data = await response.json();
    console.log(data);
    // 处理响应...
  } catch (error) {
    console.error('仿真出错:', error);
  } finally {
    isSimulating.value = false;
  }
};

// 处理DSB系统的仿真请求
const handleDSBSimulation = () => {
  // 处理DSB系统特定的仿真逻辑
  runSimulation();
};
</script>

<template>
  <div class="home-page" :class="{ 'simulation-active': isSimulationVisible }">
    <div class="back-button-container">
      <button class="back-button" @click="goBack">
        <span class="back-icon">←</span>
        <span class="back-text">返回主页</span>
      </button>
    </div>

    <div class="page-header">
      <h1>通信原理仿真实验系统</h1>
      <p class="subtitle">MWorks.sysplore 通信仿真实验平台</p>
    </div>

    <div class="simulation-layout">
      <!-- 左侧文件选择器 -->
      <div class="file-explorer">
        <div class="explorer-header">
          <div class="header-content">
            <h3>仿真系统</h3>
            <NButton
              type="primary"
              :disabled="isSimulating"
              @click="runSimulation"
              class="simulate-button"
            >
              {{ isSimulating ? '正在仿真...' : '运行仿真' }}
            </NButton>
          </div>
        </div>
        <div class="file-list">
          <div class="file-item"
               :class="{ active: selectedSystem === 'dsb' }"
               @click="selectSystem('dsb')">
            <span class="file-icon">📄</span>
            <span class="file-name">DSB调制解调</span>
          </div>
          <div class="file-item"
               :class="{ active: selectedSystem === 'system2' }"
               @click="selectSystem('system2')">
            <span class="file-icon">📄</span>
            <span class="file-name">系统2</span>
          </div>
          <div class="file-item"
               :class="{ active: selectedSystem === 'system3' }"
               @click="selectSystem('system3')">
            <span class="file-icon">📄</span>
            <span class="file-name">系统3</span>
          </div>
        </div>
      </div>

      <!-- 右侧仿真显示区域 -->
      <div class="simulation-content">
        <DSBSystem
          v-if="selectedSystem === 'dsb'"
          :isSimulating="isSimulating"
          @run-simulation="handleDSBSimulation"
        />
        <div v-else class="empty-state">
          请选择一个仿真系统
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-page {
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #1e88e5 0%, #1976d2 100%) !important; /* 渐变蓝色背景 */
  position: relative;
  overflow-y: auto;
  overflow-x: hidden;
}

.simulation-layout {
  display: flex;
  width: 90%;
  max-width: 1400px;
  height: calc(100vh - 100px);
  background-color: rgba(255, 255, 255, 0.95);
  margin: 20px auto 40px;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  position: relative;
  z-index: 1;
  backdrop-filter: blur(10px);
}

/* 左侧文件浏览器样式 */
.file-explorer {
  width: 25%;
  background-color: #fafafa;
  border-right: 1px solid #e8e8e8;
  display: flex;
  flex-direction: column;
}

.explorer-header {
  padding: 12px 16px;
  border-bottom: 1px solid #e8e8e8;
  background-color: #f5f7fa;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-content h3 {
  margin: 0;
  font-size: 14px;
  color: #1a1a1a;
  font-weight: 500;
}

.simulate-button {
  font-size: 12px;
  padding: 4px 12px;
  height: 28px;
}

.file-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.file-item {
  padding: 8px 16px;
  display: flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
  color: #595959;
  transition: all 0.2s ease;
}

.file-item:hover {
  background-color: #f5f7fa;
  color: #1890ff;
}

.file-item.active {
  background-color: #e6f7ff;
  color: #1890ff;
  border-right: 2px solid #1890ff;
}

.file-icon {
  margin-right: 8px;
  font-size: 16px;
}

.file-name {
  font-size: 13px;
}

/* 右侧仿真内容区域样式 */
.simulation-content {
  flex: 1;
  background-color: #ffffff;
  overflow: auto;
  padding: 5px;
}

.empty-state {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8c8c8c;
  font-size: 16px;
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

/* 添加标题样式 */
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

.subtitle {
  font-size: 16px;
  margin: 8px 0 0 0;
  opacity: 0.9;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}
</style>
