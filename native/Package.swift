// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "VoxlitHelper",
    platforms: [.macOS(.v13)],
    targets: [
        .executableTarget(
            name: "VoxlitHelper",
            path: "Sources/VoxlitHelper",
            linkerSettings: [
                // Carbon framework for global hotkeys
                .linkedFramework("Carbon"),
                // AVFoundation for audio capture
                .linkedFramework("AVFoundation"),
                // Accessibility API for text injection
                .linkedFramework("ApplicationServices"),
                .linkedFramework("AppKit")
            ]
        ),
        .testTarget(
            name: "VoxlitHelperTests",
            dependencies: ["VoxlitHelper"],
            path: "Tests/VoxlitHelperTests"
        )
    ]
)
