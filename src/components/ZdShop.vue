<template>
  <div class="shop" v-if="shop">
    <el-page-header
      @back="$router.back()"
      :content="shop.name"
      class="page-header"
    ></el-page-header>
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
  computed: {
    logoAndDetails() {
      if (this.shop) {
        return [this.shop.logo, ...this.shop.details];
      }
      return [];
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
.shop-detail{
  position: relative;
  padding: 50%;
}
.detail-image{
  display: block;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
</style>
