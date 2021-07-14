<template>
  <div class="shop" v-if="shop">
    <el-breadcrumb separator-class="el-icon-arrow-right" class="page-header">
      <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
      <el-breadcrumb-item>{{ shop.name }}</el-breadcrumb-item>
    </el-breadcrumb>
    <div class="shop-details">
      <div class="shop-detail" v-for="detail in logoAndDetails" :key="detail">
        <el-image
          class="detail-image"
          :src="detail"
          :preview-src-list="logoAndDetails"
          fit="cover"
        >
        </el-image>
      </div>
    </div>
    <div class="shop-distance" v-if="shopDistance">
      距离我{{ shopDistance }}米
    </div>
  </div>
</template>

<script>
export default {
  name: "ZdShop",
  props: {
    shopId: String,
  },
  data() {
    return {
      shop: null,
      userLocation: null, // 用户位置
    };
  },
  computed: {
    logoAndDetails() {
      if (this.shop) {
        return [this.shop.logo, ...this.shop.details];
      }
      return [];
    },
    shopDistance() {
      if (this.userLocation && this.shop) {
        return TMap.geometry
          .computeDistance([
            new TMap.LatLng(
              this.userLocation.latitude,
              this.userLocation.longitude
            ),
            new TMap.LatLng(
              this.shop.position.latitude,
              this.shop.position.longitude
            ),
          ])
          .toFixed();
      }
      return "";
    },
  },
  async created() {
    const loading = this.$loading();
    try {
      const {
        data: [shop],
      } = await this.cloud
        .database()
        .collection("zd_shop")
        .doc(this.shopId)
        .get();

      // 换取logo和菜单地址
      const { fileList } = await this.cloud.getTempFileURL({
        fileList: [shop.logo, ...shop.details],
      });
      shop.logo = fileList[0].tempFileURL;
      shop.details = fileList.slice(1).map((file) => file.tempFileURL);

      this.shop = shop;
    } catch (error) {
      this.$notify({
        message: error.message,
        type: "error",
      });
    } finally {
      loading.close();
    }
    // 获取用户位置
    const defaultUserLocation = {};
    const userLocation = JSON.parse(
      localStorage.getItem("zd_user_location") ||
        JSON.stringify(defaultUserLocation)
    );
    if (userLocation.latitude && userLocation.longitude) {
      this.userLocation = userLocation;
    }
  },
};
</script>
<style scoped>
.page-header {
  margin: 15px 0;
}
.shop-header {
  display: flex;
  align-items: center;
  margin: 15px 0;
}
.shop-logo-image {
  width: 50px;
  height: 50px;
  object-fit: cover;
  display: block;
  border-radius: 10px;
}
.shop-name {
  font-size: 18px;
  margin-left: 10px;
}
.shop-details {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  grid-gap: 10px;
}
.shop-detail {
  position: relative;
  padding: 50%;
}
.detail-image {
  display: block;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
.shop-distance {
  text-align: center;
  margin: 20px 0;
  color: gray;
  font-size: 14px;
}
</style>
