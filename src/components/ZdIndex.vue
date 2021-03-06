<template>
  <div class="zd-index">
    <div class="header">
      <h1>周店</h1>
      <div>
        <el-button
          type="text"
          v-show="!showGetLocationDialog"
          icon="el-icon-position"
          @click="getUserLocation"
          >{{ userLocationDisplay }}</el-button
        >
        <el-button
          type="primary"
          icon="el-icon-circle-plus"
          @click="newShop"
          size="small"
          :disabled="!userLocation || locating"
          >上传</el-button
        >
      </div>
    </div>
    <div class="body">
      <div class="shops">
        <div
          class="shop"
          v-for="shop in shops"
          :key="shop._id"
          @click="$router.push('/shop/' + shop._id)"
        >
          <div class="shop-logo">
            <img :src="shop.logo" alt="封面" class="shop-logo-image" />
          </div>
          <div class="shop-info">
            <div class="shop-name">
              {{ shop.name }}
            </div>
            <div class="shop-position">距离我{{ shop.distance }}米</div>
          </div>
        </div>
      </div>
      <div class="empty" v-if="shopsLoaded && !shops.length">
        暂无数据
      </div>
      <div class="more" v-if="shopsLoaded && moreShops">
        <el-button type="text" @click="refreshShops(shops)">加载更多</el-button>
      </div>
    </div>
    <el-dialog title="上传门店" :visible.sync="showUploadDialog" width="350px">
      <el-form
        :model="uploadForm"
        :rules="uploadRules"
        ref="uploadForm"
        label-width="60px"
      >
        <el-form-item label="名称" prop="name">
          <el-input
            placeholder="请输入门店名称"
            v-model.lazy.trim="uploadForm.name"
          >
          </el-input>
        </el-form-item>
        <el-form-item label="位置">
          <el-button
            type="text"
            icon="el-icon-position"
            @click="getUserLocation"
            >{{ userLocationDisplay }}</el-button
          >
        </el-form-item>
        <el-form-item label="门头" prop="logo">
          <el-upload
            action="https://enobj.cn"
            class="avatar-uploader"
            :show-file-list="false"
            :on-success="handleLogoSuccess"
            :http-request="uploadImg"
          >
            <img
              v-if="uploadFormTemp.logo"
              :src="uploadFormTemp.logo"
              class="avatar"
            />
            <i v-else class="el-icon-plus avatar-uploader-icon"></i>
          </el-upload>
        </el-form-item>
        <el-form-item label="菜单" prop="details">
          <el-upload
            action="https://enobj.cn"
            list-type="picture-card"
            class="avatar-uploader"
            :on-remove="handleRemoveDetail"
            :on-success="handleDetailSuccess"
            :http-request="uploadImg"
            :limit="10"
            ref="uploadDetails"
          >
            <i class="el-icon-plus avatar-uploader-icon"></i>
          </el-upload>
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            v-on:click="submit"
            :loading="submitLoading"
          >
            确认
          </el-button>
        </el-form-item>
      </el-form>
    </el-dialog>

    <el-dialog
      title="获取位置"
      :visible.sync="showGetLocationDialog"
      width="350px"
    >
      <div id="tmap"></div>
      <div class="map-action">
        <div>
          {{ userLocationTempDisplay }}
        </div>
        <div>
          <el-button type="text" v-on:click="locationToMe" v-show="!locating">
            定位
          </el-button>
          <el-button
            type="primary"
            v-on:click="
              userLocation = userLocationTemp;
              userLocationTemp = null;
              showGetLocationDialog = false;
            "
          >
            确认
          </el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import Compressor from "compressorjs";
export default {
  name: "ZdIndex",
  data() {
    return {
      userLocation: null, // 用户位置
      userLocationTemp: null, // 地图选择待确认
      locating: false, // 正在定位用户位置
      locationTranslate: false, // 正在翻译位置信息
      shops: [],
      shopsLoaded: false,
      moreShops: false,
      showUploadDialog: false,
      uploadForm: {
        name: "",
        logo: "",
        details: [],
      },
      uploadRules: {
        name: [{ required: true, message: "名称是必填项", trigger: "blur" }],
        logo: [
          { required: true, message: "门头照是必填项", trigger: "change" },
        ],
        details: [
          {
            type: "array",
            required: true,
            message: "请至少选择一张菜单",
            trigger: "change",
          },
        ],
      },
      uploadFormTemp: {
        logo: "",
      },
      submitLoading: false,
      showGetLocationDialog: false, // 显示地图dialog
    };
  },
  computed: {
    userLocationDisplay() {
      if (this.locating) {
        return "正在获取您的位置...";
      }
      if (!this.userLocation) {
        return "点击获取定位";
      }
      return this.userLocation.address;
    },
    userLocationTempDisplay() {
      if (this.locating) {
        return "正在获取您的位置...";
      }
      if (this.locationTranslate) {
        return "正在获取位置信息";
      }
      if (!this.userLocationTemp) {
        return "tip：轻触地图选择一个位置";
      }
      return this.userLocationTemp.address;
    },
  },
  watch: {
    userLocation: {
      async handler(userLocation) {
        // 用户地址放入本地缓存
        localStorage.setItem("zd_user_location", JSON.stringify(userLocation));
        this.refreshShops();
      },
      deep: true,
    },
    async "userLocationTemp.address"(address) {
      if (!address && this.userLocationTemp) {
        this.locationTranslate = true;
        const userLocation = this.userLocationTemp;
        try {
          const res = await fetch(
            `https://service-f1b28zc3-1252108641.sh.apigw.tencentcs.com/release/geo-to-city?latitude=${userLocation.latitude}&longitude=${userLocation.longitude}`
          );
          const { data } = await res.json();
          userLocation.address = data.result.address;
        } catch (error) {
          console.error(error);
          this.$notify({
            message: error.message,
            type: "error",
          });
        } finally {
          this.locationTranslate = false;
        }
      }
    },
  },
  async created() {
    if (localStorage.getItem("zd_user_location")) {
      const userLocation = JSON.parse(localStorage.getItem("zd_user_location"));
      if (userLocation.latitude && userLocation.longitude) {
        this.userLocation = userLocation;
      }
    }
    // 位置为空，请求用户授权位置
    if (!this.userLocation) {
      try {
        this.userLocation = await this.geoFindMe();
      } catch (error) {
        this.$notify({
          message: error,
          type: "error",
        });
        console.error(error);
      }
    }
  },
  methods: {
    // 获取地址中文名

    // 刷新门店列表
    async refreshShops(pagedShops = []) {
      const loading = this.$loading();
      const db = this.cloud.database();
      // 分页
      const pageSize = 20;
      try {
        const { data: shops } = await db
          .collection("zd_shop")
          .where({
            position: db.command.geoNear({
              geometry: new db.Geo.Point(
                this.userLocation.longitude,
                this.userLocation.latitude
              ),
              maxDistance: 2000,
              minDistance: 0,
            }),
          })
          .skip(pagedShops.length)
          .limit(pageSize)
          .get();
        // 一些map处理
        if (shops.length) {
          // 换取logo地址
          const { fileList } = await this.cloud.getTempFileURL({
            fileList: shops.map((shop) => shop.logo),
          });
          fileList.forEach((file, index) => {
            shops[index].logo = file.tempFileURL;
          });
          // 计算门店距离用户定位的距离（米）
          shops.forEach((shop) => {
            shop.distance = TMap.geometry
              .computeDistance([
                new TMap.LatLng(
                  this.userLocation.latitude,
                  this.userLocation.longitude
                ),
                new TMap.LatLng(
                  shop.position.latitude,
                  shop.position.longitude
                ),
              ])
              .toFixed();
          });
        }
        this.shops = pagedShops.concat(shops);
        this.shopsLoaded = true;
        this.moreShops = shops.length == pageSize;
      } catch (error) {
        console.error(error);
        this.$notify({
          message: error.message,
          type: "error",
        });
      } finally {
        loading.close();
      }
    },
    geoFindMe() {
      const _this = this;
      return new Promise(function(resolve, reject) {
        if (!navigator.geolocation) {
          return reject("您的浏览器不支持地理位置");
        }

        function success(position) {
          console.log(position);
          _this.locating = false;
          const userLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          resolve(userLocation);
        }

        function error() {
          _this.locating = false;
          reject("无法获取您的位置");
        }

        _this.locating = true;

        navigator.geolocation.getCurrentPosition(success, error);
      });
    },
    newShop() {
      this.showUploadDialog = true;
    },
    handleLogoSuccess(res, file) {
      this.uploadForm.logo = res.url;
      this.uploadFormTemp.logo = URL.createObjectURL(file.raw);
    },
    handleDetailSuccess(res) {
      this.uploadForm.details.push(res.url);
    },
    beforeUploadImg(file) {
      const isLt2M = file.size / 1024 / 1024 < 2;

      if (!isLt2M) {
        this.$message.error("上传图片大小不能超过 2MB!");
      }
      return isLt2M;
    },
    async uploadImg(options) {
      const cloudPath = `zhoudian/logo/${Date.now()}${options.file.name.substr(
        options.file.name.lastIndexOf(".")
      )}`;
      const file = await this.compress(options.file);
      const res = await this.cloud.uploadFile({
        cloudPath,
        filePath: file,
      });
      if (res.code) {
        throw new Error(res);
      }
      return {
        url: res.fileID,
      };
    },
    handleRemoveDetail(file, fileList) {
      this.uploadForm.details = fileList.map((item) => {
        return item.response.url;
      });
    },
    async submit() {
      this.submitLoading = true;
      const db = this.cloud.database();
      try {
        await this.$refs.uploadForm.validate();
        await db.collection("zd_shop").add({
          ...this.uploadForm,
          position: new db.Geo.Point(
            this.userLocation.longitude,
            this.userLocation.latitude
          ),
        });
        // 关闭弹窗
        this.showUploadDialog = false;
        // 清空表单
        this.uploadForm = {
          name: "",
          logo: "",
          details: [],
        };
        this.uploadFormTemp = {
          logo: "",
        };
        this.$refs.uploadDetails.clearFiles();
        this.refreshShops();
      } catch (error) {
        this.$notify({
          message: error.message || "请检查表单",
          type: "error",
        });
      } finally {
        this.submitLoading = false;
      }
    },
    // 本地压缩用户选择的图片，最大宽度：1000像素
    compress(file) {
      return new Promise((resolve, reject) => {
        new Compressor(file, {
          maxWidth: 1000,
          success: resolve,
          error: reject,
        });
      });
    },
    getUserLocation() {
      this.showGetLocationDialog = true;
      this.$nextTick(function() {
        if (!this.map) {
          this.map = new TMap.Map("tmap", {
            center: new TMap.LatLng(39.98412, 116.307484), //设置地图中心点坐标
            zoom: 11, //设置地图缩放级别
            viewMode: "2D",
          });
          //初始化marker图层
          this.markerLayer = new TMap.MultiMarker({
            id: "marker-layer",
            map: this.map,
          });
          // 绑定点击事件，拾取用户选中的地图坐标
          this.map.on(
            "click",
            function(evt) {
              const latitude = +evt.latLng.getLat().toFixed(6);
              const longitude = +evt.latLng.getLng().toFixed(6);
              console.log(evt);
              this.markUserLocation({
                latitude,
                longitude,
                address: (evt.poi && evt.poi.name) || "",
              });
            }.bind(this)
          );
        }
        // 如果有用户位置，则标记到地图上
        if (this.userLocation) {
          // 设置地图中心点
          this.map.setCenter(
            new TMap.LatLng(
              this.userLocation.latitude,
              this.userLocation.longitude
            )
          );
          this.markUserLocation(this.userLocation);
        }
      });
    },
    // 标记用户位置
    async markUserLocation(userLocationTemp) {
      // 先删除已有点标记
      this.markerLayer.remove(
        this.markerLayer.getGeometries().map((item) => {
          return item.id;
        })
      );
      this.markerLayer.add({
        position: new TMap.LatLng(
          userLocationTemp.latitude,
          userLocationTemp.longitude
        ),
      });
      this.userLocationTemp = userLocationTemp;
    },
    // 定位到地图上
    async locationToMe() {
      try {
        // 异步获取用户授权位置
        const userLocation = await this.geoFindMe();
        console.log(userLocation);
        // 设置地图中心点
        this.map.setCenter(
          new TMap.LatLng(userLocation.latitude, userLocation.longitude)
        );
        // 标记暂存位置
        this.markUserLocation(userLocation);
      } catch (error) {
        this.$notify({
          message: error,
          type: "error",
        });
        console.error(error);
      }
    },
  },
};
</script>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.empty {
  text-align: center;
  margin: 100px 0;
  color: gray;
  font-size: 14px;
}
.more {
  text-align: center;
  margin: 15px 0;
}
.shop {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  box-shadow: #8c939d 0px 0px 5px;
  padding: 10px;
  border-radius: 5px;
}
.shop-logo-image {
  width: 60px;
  height: 60px;
  object-fit: cover;
  display: block;
  border-radius: 10px;
}
.shop-info {
  margin-left: 10px;
}
.shop-name {
  font-size: 18px;
}
.shop-position {
  font-size: 14px;
  color: gray;
}
.map {
  width: 300px;
  height: 300px;
}
</style>
<style>
.avatar-uploader .el-upload {
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}
.avatar-uploader .el-upload:hover {
  border-color: #409eff;
}
.avatar-uploader-icon {
  font-size: 28px;
  color: #8c939d;
  width: 58px;
  height: 58px;
  line-height: 58px;
  text-align: center;
}
.avatar {
  width: 58px;
  height: 58px;
  display: block;
}
.el-upload--picture-card {
  width: 58px;
  height: 58px;
  line-height: 58px;
}
.el-upload-list--picture-card .el-upload-list__item {
  width: 58px;
  height: 58px;
}
#tmap {
  height: 300px;
}
.map-action {
  margin-top: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
