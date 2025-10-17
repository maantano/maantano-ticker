const { execSync } = require("child_process");
const path = require("path");

exports.default = async function (context) {
  const appPath = path.join(
    context.appOutDir,
    `${context.packager.appInfo.productFilename}.app`
  );

  console.log(`[afterPack] Ad-hoc signing: ${appPath}`);

  try {
    // Ad-hoc 서명 (우클릭 > 열기로 실행 가능하게 함)
    execSync(`codesign --force --deep --sign - "${appPath}"`, {
      stdio: "inherit",
    });
    console.log("[afterPack] Ad-hoc signing completed successfully");
  } catch (error) {
    console.error("[afterPack] Ad-hoc signing failed:", error.message);
    // 서명 실패해도 빌드는 계속 진행
  }
};
