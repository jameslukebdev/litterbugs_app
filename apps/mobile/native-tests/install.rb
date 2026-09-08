# Run after Expo prebuild. Only modifies the generated, ignored iOS project.
require 'xcodeproj'
root = File.expand_path('..', __dir__)
project = Xcodeproj::Project.open(File.join(root, 'ios/Litterbugs.xcodeproj'))
app = project.targets.find { |t| t.name == 'Litterbugs' }
target = project.targets.find { |t| t.name == 'LitterbugsUIRegression' } || project.new_target(:ui_test_bundle, 'LitterbugsUIRegression', :ios, '15.1')
target.add_dependency(app) unless target.dependencies.any? { |d| d.target == app }
source = File.join(__dir__, 'LitterbugsUIRegression.swift')
ref = project.files.find { |f| f.real_path.to_s == source } || project.main_group.new_file(source)
target.source_build_phase.add_file_reference(ref) unless target.source_build_phase.files_references.include?(ref)
target.build_configurations.each do |config|
  config.build_settings.merge!({'PRODUCT_NAME'=>'$(TARGET_NAME)', 'ONLY_ACTIVE_ARCH'=>'YES', 'PRODUCT_BUNDLE_IDENTIFIER'=>'com.gegibson.litterbugs.uiregression', 'GENERATE_INFOPLIST_FILE'=>'YES', 'SWIFT_VERSION'=>'5.0', 'TEST_TARGET_NAME'=>'Litterbugs', 'CODE_SIGNING_ALLOWED'=>'YES', 'CODE_SIGN_IDENTITY'=>'-', 'TARGETED_DEVICE_FAMILY'=>'1,2'})
end
project.save
scheme = Xcodeproj::XCScheme.new
scheme.add_build_target(app)
scheme.add_build_target(target)
scheme.add_test_target(target)
scheme.test_action.build_configuration = 'Release'
scheme.launch_action.build_configuration = 'Release'
scheme.save_as(project.path, 'LitterbugsUIRegression')
puts 'Installed LitterbugsUIRegression scheme into the generated iOS project.'
