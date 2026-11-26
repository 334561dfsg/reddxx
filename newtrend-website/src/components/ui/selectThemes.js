import {theme} from 'ant-design-vue'
// Dark Ant Design Select themes reproducing the reference controls.
// pill: deposit coin/network pickers (48px, fully rounded, accent selection) · field: lending term/collateral (48px, 12px radius, neutral selection).
export const selectThemes = {
  pill: {algorithm:theme.darkAlgorithm,token:{colorPrimary:'#a5ff4a',colorBgContainer:'#0c1017',colorBgElevated:'#0c1017',colorText:'#ffffff',colorTextPlaceholder:'#a0a1a2',colorBorder:'#191b1f',controlOutline:'transparent',controlOutlineWidth:0,borderRadius:24,borderRadiusLG:24,fontSize:14},components:{Select:{controlHeight:48,optionPadding:'12px 16px',optionSelectedBg:'rgba(165,255,74,.1)',optionSelectedColor:'#a5ff4a',optionActiveBg:'rgba(255,255,255,.04)'}}},
  field: {algorithm:theme.darkAlgorithm,token:{colorPrimary:'#d1d5db',colorBgContainer:'#0c0e10',colorBgElevated:'#191c20',colorText:'#f5f6f7',colorBorder:'#ffffff1f',controlOutline:'transparent',borderRadius:12,fontSize:14},components:{Select:{optionSelectedBg:'#ffffff0d',optionActiveBg:'#ffffff08',optionSelectedColor:'#f5f6f7',controlHeight:48}}},
}
