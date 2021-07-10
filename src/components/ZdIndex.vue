<template>
  <div class="zd-index">
    <div class="header">
      <h1>周店</h1>
      <div>
        <el-button type="text" icon="el-icon-position" @click="geoFindMe">{{
          userLocationDisplay
        }}</el-button>
        <el-button
          type="primary"
          icon="el-icon-plus"
          @click="newShop"
          size="small"
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
            <div class="shop-position">距离我{{ shop.distance }}m</div>
          </div>
        </div>
      </div>
      <div class="empty" v-if="shopsLoaded && !shops.length">
        暂无数据
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
          <el-button type="text" icon="el-icon-position" @click="geoFindMe">{{
            userLocationDisplay
          }}</el-button>
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
            :on-remove="handleRemoveDetail"
            :on-success="handleDetailSuccess"
            :http-request="uploadImg"
          >
            <i class="el-icon-plus"></i>
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
  </div>
</template>

<script>
import Compressor from "compressorjs";
export default {
  name: "ZdIndex",
  data() {
    return {
      userLocation: {
        latitude: 42,
        longitude: 113,
        desc: {
          address: "郑州市郑东新区会展中心",
        },
      }, // 用户位置
      locating: false, // 正在定位用户位置
      shops: [],
      shopsLoaded: false,
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
    };
  },
  computed: {
    userLocationDisplay() {
      if (this.locating) {
        return "定位中...";
      }
      if (!this.userLocation) {
        return "点击获取定位";
      }
      return this.userLocation.desc.address;
    },
  },
  watch: {
    userLocation: {
      async handler(userLocation) {
        localStorage.setItem("zd_user_location", JSON.stringify(userLocation));
        this.refreshShops();
      },
      deep: true,
    },
  },
  async created() {
    // 从本地缓存加载用户位置
    const userLocationJson = localStorage.getItem("zd_user_location");
    if (userLocationJson) {
      this.userLocation = JSON.parse(userLocationJson);
    }
    this.refreshShops();
  },
  methods: {
    async refreshShops() {
      const loading = this.$loading();
      const db = this.cloud.database();
      try {
        const { data: shops } = await db
          .collection("zd_shop")
          .where({
            position: db.command.geoNear({
              geometry: new db.Geo.Point(
                this.userLocation.longitude,
                this.userLocation.latitude
              ),
              maxDistance: 10000,
              minDistance: 0,
            }),
          })
          .get();
        // 换取logo地址
        const { fileList } = await this.cloud.getTempFileURL({
          fileList: shops.map((shop) => shop.logo),
        });
        fileList.forEach((file, index) => {
          shops[index].logo = file.tempFileURL;
        });
        // 计算位置
        shops.forEach((shop) => {
          shop.distance = TMap.geometry.computeDistance([
            new TMap.LatLng(
              this.userLocation.latitude,
              this.userLocation.longitude
            ),
            new TMap.LatLng(shop.position.latitude, shop.position.longitude),
          ]);
        });
        this.shops = shops;
        this.shopsLoaded = true;
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
      if (!navigator.geolocation) {
        this.$notify({
          message: "您的浏览器不支持地理位置",
          type: "warning",
        });
        return;
      }

      async function success(position) {
        const userLocation = position.coords;
        const res = await fetch(
          `https://apis.map.qq.com/ws/geocoder/v1/?key=RFGBZ-IMPLX-BVW4P-TOS7W-77DQ7-BIBTD&location=${userLocation.latitude},${userLocation.longitude}`
        );
        userLocation.desc = await res.json();
        _this.userLocation = userLocation;
        _this.locating = false;
      }

      function error() {
        _this.locating = false;
        _this.$notify({
          message: "无法获取您的位置",
          type: "error",
        });
      }

      this.locating = true;

      navigator.geolocation.getCurrentPosition(success, error);
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
        this.showUploadDialog = false;
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
    compress(file) {
      return new Promise((resolve, reject) => {
        new Compressor(file, {
          quality: 0.6,
          maxWidth: 500,
          success: resolve,
          error: reject,
        });
      });
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
  margin: 50px 0;
  color: gray;
  font-size: 14px;
}
.shop {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  box-shadow: #8c939d 0px 0px 5px;
  padding: 10px;
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
  width: 148px;
  height: 148px;
  line-height: 148px;
  text-align: center;
}
.avatar {
  width: 148px;
  height: 148px;
  display: block;
}
</style>
