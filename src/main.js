import Vue from "vue";
import App from "./App.vue";
import cloudbase from "@cloudbase/js-sdk";
import VueRouter from "vue-router";
import ElementUI from "element-ui";
import "element-ui/lib/theme-chalk/index.css";
import EoCloud from "./components/EoCloud.vue";
import ZdIndex from "./components/ZdIndex.vue";
import ZdShop from "./components/ZdShop.vue";

Vue.config.productionTip = false;

// 云服务
const cloud = (Vue.prototype.cloud = cloudbase.init({
  env: process.env.VUE_APP_CLOUD_NAME,
}));
const cloudAuth = (Vue.prototype.cloudAuth = cloud.auth({
  persistence: "local",
}));

// UI框架
Vue.use(ElementUI);

// 路由
Vue.use(VueRouter);
const routes = [
  { path: "/", redirect: "/index" },
  { path: "/index", component: ZdIndex },
  { path: "/shop/:shopId", component: ZdShop, props: true },
  { path: "/cloud", component: EoCloud },
];
const router = new VueRouter({
  routes, // （缩写）相当于 routes: routes
});
// 路由守卫，登录验证
router.beforeEach((to, from, next) => {
  if (to.path !== "/cloud" && !cloudAuth.hasLoginState()) {
    next("/cloud");
  } else {
    next();
  }
});

new Vue({
  render: (h) => h(App),
  router,
}).$mount("#app");
