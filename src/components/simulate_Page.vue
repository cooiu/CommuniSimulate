<script setup>
import { ref,nextTick } from 'vue';
import DSBSystem from './DSB_Modem.vue';
import { executeCode } from '../services/api';

const selectedSystem = ref('');
const isSimulationVisible = ref(false);
const isSimulating = ref(false);
const DSBModuleParams = ref(null);
const emit = defineEmits(['trigger-next']);

// 选择系统
const selectSystem = async (system) => {
  selectedSystem.value = system;
  isSimulationVisible.value = true;

  // 等待 DOM 更新完成
  await nextTick();

  // 确保 dsbSystemRef.value 存在
  if (DSBModuleParams.value) {
    console.log(DSBModuleParams.value.moduleParams);
  } else {
    console.error('DSBSystem 组件未正确挂载');
  }
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

    // 通知DSB_Modem组件开始加载
    if (DSBModuleParams.value && DSBModuleParams.value.startLoading) {
      DSBModuleParams.value.startLoading();
    }

    // 调用后端API
    const DSBmoduleParams = DSBModuleParams.value.moduleParams;
    // 动态生成 Julia 代码
    const code = `
using TyBase
using TyMath
using TyDSPSystem
using TySignalProcessing

base_fre = ${DSBmoduleParams.baseband.frequency}
base_amp = ${DSBmoduleParams.baseband.amplitude}
base_phase = ${DSBmoduleParams.baseband.phaseoffset}
mul_fre = ${DSBmoduleParams.multiplier.frequency}
mul_amp = ${DSBmoduleParams.multiplier.amplitude}
mul_phase = ${DSBmoduleParams.multiplier.phaseoffset}
cha_psd = ${DSBmoduleParams.channel.PSD}
cha_amp = ${DSBmoduleParams.channel.amplitude}
bandpass_upfre = ${DSBmoduleParams.bandpass.upFrequency}
bandpass_dowfre = ${DSBmoduleParams.bandpass.downFrequency}
demul_fre = ${DSBmoduleParams.demodulator.frequency}
demul_amp = ${DSBmoduleParams.demodulator.amplitude}
demul_phase = ${DSBmoduleParams.demodulator.phaseoffset}
lowpass_fre = ${DSBmoduleParams.lowpass.cutoffFreq}

    #设置统一采样率
    Samplerate = max(base_fre, mul_fre) * 10
    t = 0:1/Samplerate:1

    # 生成基带信号
    base_signal = base_amp*sin.(2*pi*base_fre*t.+base_phase)
    base_signal_fft = fft(base_signal)               # 计算 FFT
    base_signal_fft_magnitude = abs.(base_signal_fft)   # 取幅值
    base_signal_fft_freqs = fftfreq(length(base_signal_fft), Samplerate)  # 计算频率轴

    # 生成载波信号
    carrier_signal = mul_amp*sin.(2*pi*mul_fre*t.+mul_phase)

    # DSB调制：基带信号与载波信号相乘
    modulated_signal = base_signal .* carrier_signal
    modulated_signal_fft = fft(modulated_signal)               # 计算 FFT
    modulated_signal_fft_magnitude = abs.(modulated_signal_fft)   # 取幅值
    modulated_signal_fft_freqs = fftfreq(length(modulated_signal_fft), Samplerate)  # 计算频率轴

    # 通过信道：添加高斯白噪声
    Fs = 1000  # 采样率
    noise_power = cha_psd * Fs  # 噪声的总功率
    noise_std = sqrt(noise_power)  # 噪声的标准差
    channel_noise = noise_std .* randn(size(modulated_signal))  # 生成高斯白噪声
    transmitted_signal = modulated_signal + cha_amp*channel_noise  # 添加噪声到调制信号
    transmitted_signal_fft = fft(transmitted_signal)               # 计算 FFT
    transmitted_signal_fft_magnitude = abs.(transmitted_signal_fft)   # 取幅值
    transmitted_signal_fft_freqs = fftfreq(length(transmitted_signal_fft), Samplerate)  # 计算频率轴

    # 带通滤波
    bandpa = [bandpass_dowfre bandpass_upfre]
    filtered_signal,= bandpass(transmitted_signal,bandpa,Samplerate)
    filtered_signal_fft = fft(filtered_signal)               # 计算 FFT
    filtered_signal_fft_magnitude = abs.(filtered_signal_fft)   # 取幅值
    filtered_signal_fft_freqs = fftfreq(length(filtered_signal_fft), Samplerate)  # 计算频率轴

    # 解调：与本地载波信号相乘
    local_carrier = demul_amp*sin.(2*pi*demul_fre*t.+demul_phase)
    demodulated_signal = filtered_signal .* local_carrier
    demodulated_signal_fft = fft(demodulated_signal)               # 计算 FFT
    demodulated_signal_fft_magnitude = abs.(demodulated_signal_fft)   # 取幅值
    demodulated_signal_fft_freqs = fftfreq(length(demodulated_signal_fft), Samplerate)  # 计算频率轴

    # 低通滤波
    recovered_signal, = lowpass(demodulated_signal, lowpass_fre, Samplerate)
    recovered_signal_fft = fft(recovered_signal)               # 计算 FFT
    recovered_signal_fft_magnitude = abs.(recovered_signal_fft)   # 取幅值
    recovered_signal_fft_freqs = fftfreq(length(recovered_signal_fft), Samplerate)  # 计算频率轴

     # 返回包含所有信号的数组
    re = [
        Dict(
            "name" => "base_signal",
            "time_signal" => base_signal,
            "freq" => base_signal_fft_freqs,
            "freq_magnitude" => base_signal_fft_magnitude
        ),
        Dict(
            "name" => "modulated_signal",
            "time_signal" => modulated_signal,
            "freq" => modulated_signal_fft_freqs,
            "freq_magnitude" => modulated_signal_fft_magnitude
        ),
        Dict(
            "name" => "transmitted_signal",
            "time_signal" => transmitted_signal,
            "freq" => transmitted_signal_fft_freqs,
            "freq_magnitude" => transmitted_signal_fft_magnitude
        ),
        Dict(
            "name" => "filtered_signal",
            "time_signal" => filtered_signal,
            "freq" => filtered_signal_fft_freqs,
            "freq_magnitude" => filtered_signal_fft_magnitude
        ),
        Dict(
            "name" => "demodulated_signal",
            "time_signal" => demodulated_signal,
            "freq" => demodulated_signal_fft_freqs,
            "freq_magnitude" => demodulated_signal_fft_magnitude
        ),
        Dict(
            "name" => "recovered_signal",
            "time_signal" => recovered_signal,
            "freq" => recovered_signal_fft_freqs,
            "freq_magnitude" => recovered_signal_fft_magnitude
        )
    ]
    `

// 打印生成的代码，查看是否正确
    console.log(code);

    // 使用API服务执行代码
    const data = await executeCode(code);
    console.log("返回数据:",data);

    // 将数据传递给DSB_Modem组件
    if (data && data.data && DSBModuleParams.value && DSBModuleParams.value.updateParentData) {
      DSBModuleParams.value.updateParentData(data);

      // 选择基带信号作为默认显示
      if (DSBModuleParams.value.handleModuleClick) {
        DSBModuleParams.value.handleModuleClick('baseband');
      }
    }
  } catch (error) {
    console.error('仿真出错:', error);
    isSimulating.value = false;
  }
};

// 停止仿真
const stopSimulation = () => {
  isSimulating.value = false;
};

// 处理DSB系统的仿真请求
const handleDSBSimulation = () => {
  // 处理DSB系统特定的仿真逻辑
  runSimulation();
};

// 处理DSB系统的停止仿真请求
const handleDSBStopSimulation = () => {
  stopSimulation();
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
      <h1>MWORKS在线仿真平台</h1>
      <p class="subtitle">MWorks.sysplore 仿真实验平台</p>
    </div>

    <div class="simulation-layout">
      <!-- 左侧文件选择器 -->
      <div class="file-explorer">
        <div class="explorer-header">
          <div class="header-content">
            <h3>仿真系统</h3>
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
          ref="DSBModuleParams"
          @run-simulation="handleDSBSimulation"
          @stop-simulation="handleDSBStopSimulation"
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
