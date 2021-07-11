<template>
  <div id="app">
    <el-row type="flex" justify="space-around">
      <el-col :xs="24" :sm="20" :md="16" :lg="12">
        <keep-alive include="ZdIndex">
          <router-view></router-view>
        </keep-alive>
      </el-col>
    </el-row>
  </div>
</template>

<script>
export default {
  name: "App",
};
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
}
</style>
