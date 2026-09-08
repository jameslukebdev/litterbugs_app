# Run after Expo prebuild. Only modifies the generated, ignored iOS project.
require 'xcodeproj'
root = File.expand_path('..', __dir__)
project = Xcodeproj::Project.open(File.join(root, 'ios/Litterbugs.xcodeproj'))
app = project.targets.find { |t| t.name == 'Litterbugs' }
%w[LitterbugsUIRegression LitterbugsFixtureRegression].each do |name|
  target = project.targets.find { |t| t.name == name } || project.new_target(:ui_test_bundle, name, :ios, '15.1')
  target.add_dependency(app) unless target.dependencies.any? { |d| d.target == app }
  source = File.join(__dir__, "#{name}.swift")
  ref = project.files.find { |f| f.real_path.to_s == source } || project.main_group.new_file(source)
  # Keep fixture tests out of the normal app suite: that separate app is optional.
  target.source_build_phase.files.to_a.each do |file|
    target.source_build_phase.remove_build_file(file) if file.file_ref != ref
  end
  target.source_build_phase.add_file_reference(ref) unless target.source_build_phase.files_references.include?(ref)
  target.build_configurations.each do |config|
    config.build_settings.merge!({'PRODUCT_NAME'=>'$(TARGET_NAME)', 'ONLY_ACTIVE_ARCH'=>'YES', 'PRODUCT_BUNDLE_IDENTIFIER'=>(name == 'LitterbugsUIRegression' ? 'com.gegibson.litterbugs.uiregression' : 'com.gegibson.litterbugs.fixtureregression'), 'GENERATE_INFOPLIST_FILE'=>'YES', 'SWIFT_VERSION'=>'5.0', 'TEST_TARGET_NAME'=>'Litterbugs', 'CODE_SIGNING_ALLOWED'=>'YES', 'CODE_SIGN_IDENTITY'=>'-', 'TARGETED_DEVICE_FAMILY'=>'1,2'})
  end
  scheme = Xcodeproj::XCScheme.new
  scheme.add_build_target(app)
  scheme.add_build_target(target)
  scheme.add_test_target(target)
  scheme.test_action.build_configuration = 'Release'
  scheme.launch_action.build_configuration = 'Release'
  scheme.save_as(project.path, name)
end
project.save
puts 'Installed separate app and fixture regression schemes into the generated iOS project.'
