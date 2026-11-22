import type { PageId } from '../types/civic';

export interface PageBackdrop {
  imageUrl: string;
  alt: string;
  fallbackGradient: string;
}

export const PAGE_BACKGROUNDS: Record<PageId, PageBackdrop> = {
  landing: {
    imageUrl: '/src/assets/images/bg_landing_city_1795323862573.jpg',
    alt: 'Futuristic metropolitan smart city aerial view at night',
    fallbackGradient: 'radial-gradient(circle at 20% 20%, #0f295c 0%, #050b18 65%, #020611 100%)',
  },
  login: {
    imageUrl: '/src/assets/images/bg_login_skyline_1795323868168.jpg',
    alt: 'Illuminated modern city skyline over calm water',
    fallbackGradient: 'radial-gradient(circle at 70% 25%, #132a5e 0%, #060d1f 68%, #030712 100%)',
  },
  register: {
    imageUrl: '/src/assets/images/bg_register_urban_1795323868987.jpg',
    alt: 'Modern urban bridge and arterial infrastructure at blue hour',
    fallbackGradient: 'radial-gradient(circle at 30% 30%, #0e3358 0%, #060d1f 70%, #020611 100%)',
  },
  'citizen-dashboard': {
    imageUrl: '/src/assets/images/bg_citizen_aerial_1795323867522.jpg',
    alt: 'Aerial photograph of an intelligent modern city district',
    fallbackGradient: 'radial-gradient(circle at 50% 20%, #0e2e5c 0%, #050b18 70%, #020611 100%)',
  },
  'report-issue': {
    imageUrl: '/src/assets/images/bg_report_roads_1795323868020.jpg',
    alt: 'Urban multi-lane roads and smart traffic infrastructure at dusk',
    fallbackGradient: 'radial-gradient(circle at 40% 25%, #112a52 0%, #060d1e 72%, #020611 100%)',
  },
  'ai-analysis': {
    imageUrl: '/src/assets/images/bg_ai_intelligence_1795323869005.jpg',
    alt: 'Futuristic optical fiber array and digital intelligence infrastructure',
    fallbackGradient: 'radial-gradient(circle at 60% 25%, #1a245c 0%, #050b18 70%, #020611 100%)',
  },
  'civic-ripple': {
    imageUrl: '/src/assets/images/bg_analytics_grid_1795323868127.jpg',
    alt: 'Interconnected urban transit and power grid network at night',
    fallbackGradient: 'radial-gradient(circle at 50% 30%, #162259 0%, #050b18 72%, #020611 100%)',
  },
  'track-complaint': {
    imageUrl: '/src/assets/images/bg_track_transit_1795323867984.jpg',
    alt: 'Modern city transit station and elevated infrastructure at night',
    fallbackGradient: 'radial-gradient(circle at 35% 25%, #0f2c59 0%, #050b18 70%, #020611 100%)',
  },
  'admin-dashboard': {
    imageUrl: '/src/assets/images/bg_admin_command_1795323867593.jpg',
    alt: 'Futuristic municipal smart city operations command centre',
    fallbackGradient: 'radial-gradient(circle at 50% 20%, #0e244d 0%, #050b18 70%, #020611 100%)',
  },
  analytics: {
    imageUrl: '/src/assets/images/bg_analytics_grid_1795323868127.jpg',
    alt: 'Smart city monitoring corridor and fiber-optic urban grid',
    fallbackGradient: 'radial-gradient(circle at 45% 25%, #152557 0%, #050b18 70%, #020611 100%)',
  },
  'fix-verify': {
    imageUrl: '/src/assets/images/bg_fixverify_road_1795323868418.jpg',
    alt: 'Modern urban road maintenance and resurfacing operation at twilight',
    fallbackGradient: 'radial-gradient(circle at 40% 25%, #0d2b4e 0%, #050b18 70%, #020611 100%)',
  },
};
