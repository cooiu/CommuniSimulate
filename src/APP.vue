<script setup>
import { ref } from 'vue';
import HomePage from './components/simulate_Page.vue';
import SecondPage from './components/code_Page.vue';

const currentPage = ref('main');

const handlePageChange = (page) => {
  currentPage.value = page;
};
</script>

<template>
  <div class="app-container">
    <!-- 主页面 -->
    <div v-if="currentPage === 'main'" class="main-container">
      <!-- 导航栏 -->
      <nav class="navbar">
        <div class="nav-logo">
          <img src="./assets/communication.png" alt="BUPT Logo" class="logo-img" />
          <span class="logo-text">MWORKS在线仿真平台</span>
        </div>
        <div class="nav-links">
          <a href="#" class="nav-link">帮助</a>
        </div>
      </nav>

      <!-- 主页面内容 -->
      <div class="main-content">
        <h1 class="main-title">MWORKS在线仿真平台</h1>
        <p class="main-subtitle-illu">面向通信原理课程</p>
        <p class="main-subtitle">选择您要进入的模块</p>
        <div class="buttons-container">
          <button @click="handlePageChange('simulate')" class="nav-button">
            <div class="button-content">
              <img src="./assets/wave.png" alt="模拟" class="button-icon">
              <div class="button-text-container">
                <span class="button-title">模拟界面</span>
                <span class="button-desc">进行通信系统仿真实验</span>
              </div>
            </div>
          </button>
          <button @click="handlePageChange('code')" class="nav-button">
            <div class="button-content">
              <img src="./assets/code.png" alt="代码" class="button-icon">
              <div class="button-text-container">
                <span class="button-title">代码界面</span>
                <span class="button-desc">编写和运行仿真代码</span>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>

    <!-- 其他页面组件 -->
    <HomePage v-else-if="currentPage === 'simulate'" @trigger-next="handlePageChange" />
    <SecondPage v-else-if="currentPage === 'code'" @trigger-next="handlePageChange" />
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: fixed;
  left: 0;
  top: 0;
}

/* 主容器样式 */
.app-container {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #1e88e5 0%, #1976d2 100%) !important; /* 渐变蓝色背景 */
  overflow: hidden;
}

/* 主页面容器 */
.main-container {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: transparent;
}

.navbar {
  height: 60px;
  background-color: #ffffff !important;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  z-index: 1000;
  position: relative;
}

.nav-logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-img {
  height: 40px;
}

.logo-text {
  color: #333333;
  font-size: 18px;
  font-weight: 600;
}

.nav-link {
  color: #333333;
  text-decoration: none;
  font-weight: 600;
  padding: 8px 16px;
}

.nav-link:hover {
  color: #000000;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 20px;
  color: white;
}

.main-title {
  font-size: 42px;
  font-weight: 600;
  margin-bottom: 16px;
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.main-subtitle-illu {
  font-size: 10px;
  color: rgba(64, 245, 169, 0.9);
  margin-bottom: 48px;
  }

.main-subtitle {
  font-size: 20px;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 48px;
}

.buttons-container {
  display: flex;
  gap: 32px;
  justify-content: center;
}

.nav-button {
  background: rgba(255, 255, 255, 0.95);
  border: none;
  border-radius: 12px;
  padding: 20px 30px;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 240px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.nav-button:hover {
  transform: translateY(-4px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
  background: white;
}

.button-content {
  display: flex;
  align-items: center;
  gap: 15px;
}

.button-icon {
  width: 32px;
  height: 32px;
  object-fit: contain;
}

.button-text-container {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.button-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--bupt-dark-blue);
  text-align: left;
}

.button-desc {
  font-size: 14px;
  color: #666666;
  text-align: left;
}

/* 确保子页面也填充满屏幕 */
.home-page,
.code-page {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background-color: var(--bupt-blue);
}
</style>
