<template>
  <div class="shop" v-if="shop">
    <div class="shop-header">
      <el-page-header
        @back="$router.back()"
        :content="shop.name"
      ></el-page-header>
      <div class="shop-logo">
        <img :src="shop.logo" alt="封面" class="shop-logo-image" />
      </div>
    </div>
    <div class="shop-details">
      <div
        class="shop-detail"
        v-for="(detail, index) in shop.details"
        :key="detail"
      >
        <el-image
          style="max-width: 90%;"
          :src="detail"
          :preview-src-list="shop.details"
        >
        </el-image>
        <div class="img-index">附图.{{ index + 1 }}/{{ shop.details.length }}</div>
      </div>
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
    };
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
  },
};
</script>
<style scoped>
.shop-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
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
  margin-top: 15px;
}
.shop-detail {
  text-align: center;
  margin-bottom: 15px;
}
.img-index {
  margin-top: 10px;
  color: gray;
  font-size: 12px;
}
</style>
