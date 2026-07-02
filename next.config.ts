import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // tesseract.js는 Node 워커를 자식 프로세스로 스폰하기 위해 실제 파일 경로를 사용하는데,
  // Next.js가 이 패키지를 번들링하면 그 경로가 깨진다. 번들링에서 제외하고 node_modules에서
  // 그대로 require하도록 해서 워커 스크립트 경로가 올바르게 유지되게 한다.
  serverExternalPackages: ["tesseract.js"],
};

export default nextConfig;
