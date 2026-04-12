const { withDangerousMod } = require('expo/config-plugins')
const fs = require('fs')
const path = require('path')

module.exports = function withSwiftConcurrencyFix(config) {
  return withDangerousMod(config, [
    'ios',
    (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile')

      if (!fs.existsSync(podfilePath)) {
        console.warn('[withSwiftConcurrencyFix] Podfile not found, skipping')
        return config
      }

      let podfile = fs.readFileSync(podfilePath, 'utf-8')

      // Force Swift 5 for all pods to disable Swift 6 strict concurrency
      const swiftVersionFix = `
    # Force Swift 5 to disable Swift 6 strict concurrency checks
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |build_config|
        build_config.build_settings['SWIFT_VERSION'] = '5'
        build_config.build_settings['SWIFT_STRICT_CONCURRENCY'] = 'minimal'
        build_config.build_settings['SWIFT_TREAT_WARNINGS_AS_ERRORS'] = 'NO'
        build_config.build_settings['GCC_TREAT_WARNINGS_AS_ERRORS'] = 'NO'
      end
    end`

      if (podfile.includes('SWIFT_VERSION')) {
        console.log('[withSwiftConcurrencyFix] Podfile already patched')
        return config
      }

      if (podfile.includes('post_install do |installer|')) {
        podfile = podfile.replace(
          'post_install do |installer|',
          `post_install do |installer|${swiftVersionFix}`
        )
      } else {
        podfile += `\npost_install do |installer|${swiftVersionFix}\nend\n`
      }

      fs.writeFileSync(podfilePath, podfile)
      console.log('[withSwiftConcurrencyFix] Patched Podfile with SWIFT_VERSION=5')

      return config
    },
  ])
}
