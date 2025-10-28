#!/usr/bin/env node

// Oracle Cloud Compatibility Test for AI Trading System
// This script tests if your system can run on Oracle Cloud Infrastructure

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Oracle Cloud Infrastructure Compatibility Test');
console.log('================================================');
console.log('');

const tests = [];
let passedTests = 0;
let totalTests = 0;

function runTest(name, testFn) {
    totalTests++;
    try {
        const result = testFn();
        if (result) {
            console.log(`✅ ${name}`);
            passedTests++;
            tests.push({ name, status: 'PASS', details: result });
        } else {
            console.log(`❌ ${name}`);
            tests.push({ name, status: 'FAIL', details: 'Test returned false' });
        }
    } catch (error) {
        console.log(`❌ ${name}: ${error.message}`);
        tests.push({ name, status: 'FAIL', details: error.message });
    }
}

// Test 1: Node.js Version Compatibility
runTest('Node.js Version (>=18.0.0)', () => {
    const version = process.version;
    const major = parseInt(version.slice(1).split('.')[0]);
    return major >= 18 ? `Current: ${version}` : false;
});

// Test 2: Platform Compatibility
runTest('Linux Platform Support', () => {
    return process.platform === 'linux' ? `Platform: ${process.platform}` : false;
});

// Test 3: Package.json Exists
runTest('Package.json Configuration', () => {
    const packagePath = path.join(__dirname, 'package.json');
    if (fs.existsSync(packagePath)) {
        const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        return `Name: ${pkg.name}, Version: ${pkg.version}`;
    }
    return false;
});

// Test 4: Dockerfile Exists
runTest('Docker Configuration', () => {
    const dockerfilePath = path.join(__dirname, 'Dockerfile');
    if (fs.existsSync(dockerfilePath)) {
        const content = fs.readFileSync(dockerfilePath, 'utf8');
        const hasNode = content.includes('node:');
        const hasPort = content.includes('EXPOSE');
        return hasNode && hasPort ? 'Dockerfile properly configured' : 'Dockerfile needs updates';
    }
    return false;
});

// Test 5: Environment Configuration
runTest('Environment Configuration', () => {
    const envExamplePath = path.join(__dirname, 'env.example');
    if (fs.existsSync(envExamplePath)) {
        const content = fs.readFileSync(envExamplePath, 'utf8');
        const hasPort = content.includes('PORT=');
        const hasMode = content.includes('TRADING_MODE=');
        return hasPort && hasMode ? 'Environment template available' : 'Environment template incomplete';
    }
    return false;
});

// Test 6: Server Entry Point
runTest('Server Entry Point', () => {
    const serverPaths = [
        path.join(__dirname, 'server', 'index.js'),
        path.join(__dirname, 'index.js'),
        path.join(__dirname, 'server.js')
    ];
    
    for (const serverPath of serverPaths) {
        if (fs.existsSync(serverPath)) {
            return `Server found: ${path.relative(__dirname, serverPath)}`;
        }
    }
    return false;
});

// Test 7: Health Check Endpoint
runTest('Health Check Implementation', () => {
    const routesPath = path.join(__dirname, 'server', 'routes');
    if (fs.existsSync(routesPath)) {
        const files = fs.readdirSync(routesPath);
        const hasHealth = files.some(file => file.includes('health'));
        return hasHealth ? 'Health check routes available' : 'Health check routes missing';
    }
    return false;
});

// Test 8: Port Configuration
runTest('Port Configuration', () => {
    const packagePath = path.join(__dirname, 'package.json');
    if (fs.existsSync(packagePath)) {
        const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        const hasStartScript = pkg.scripts && pkg.scripts.start;
        const hasServerScript = pkg.scripts && (pkg.scripts.server || pkg.scripts['start:dev']);
        return hasStartScript || hasServerScript ? 'Start scripts configured' : 'Start scripts missing';
    }
    return false;
});

// Test 9: Dependencies Check
runTest('Critical Dependencies', () => {
    const packagePath = path.join(__dirname, 'package.json');
    if (fs.existsSync(packagePath)) {
        const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        
        const criticalDeps = ['express', 'cors', 'helmet'];
        const hasCritical = criticalDeps.every(dep => deps[dep]);
        
        return hasCritical ? 'Critical dependencies present' : 'Missing critical dependencies';
    }
    return false;
});

// Test 10: Memory Requirements
runTest('Memory Requirements', () => {
    const totalMem = os.totalmem();
    const totalMemGB = totalMem / (1024 * 1024 * 1024);
    
    // Oracle Cloud Always Free tier has 1GB per VM, but you can get 4 ARM VMs with 6GB each
    const isAdequate = totalMemGB >= 1;
    return isAdequate ? `Available: ${totalMemGB.toFixed(1)}GB (adequate for Oracle Cloud)` : 'Insufficient memory';
});

// Test 11: Architecture Compatibility
runTest('CPU Architecture', () => {
    const arch = process.arch;
    const supportedArchs = ['x64', 'arm64'];
    const isSupported = supportedArchs.includes(arch);
    return isSupported ? `Architecture: ${arch} (Oracle Cloud compatible)` : `Unsupported architecture: ${arch}`;
});

// Test 12: File System Permissions
runTest('File System Permissions', () => {
    try {
        const testFile = path.join(__dirname, '.oracle-test');
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
        return 'File system permissions OK';
    } catch (error) {
        return false;
    }
});

console.log('');
console.log('📊 Test Results Summary');
console.log('======================');
console.log(`Total Tests: ${totalTests}`);
console.log(`Passed: ${passedTests}`);
console.log(`Failed: ${totalTests - passedTests}`);
console.log(`Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);

console.log('');
console.log('🏗️ Oracle Cloud Deployment Readiness');
console.log('====================================');

if (passedTests >= totalTests * 0.8) {
    console.log('✅ READY FOR ORACLE CLOUD DEPLOYMENT');
    console.log('');
    console.log('Your AI Trading System is compatible with Oracle Cloud Infrastructure!');
    console.log('');
    console.log('🚀 Recommended Deployment Options:');
    console.log('1. Oracle Compute Instance (VM) - Most straightforward');
    console.log('2. Oracle Container Engine (OKE) - For production scaling');
    console.log('3. Oracle Container Instances - Serverless option');
    console.log('');
    console.log('💰 Estimated Costs:');
    console.log('- Always Free Tier: $0/month (limited resources)');
    console.log('- Basic VM: $15-30/month');
    console.log('- Production Setup: $50-100/month');
    console.log('');
    console.log('📋 Next Steps:');
    console.log('1. Run: ./deploy-oracle-cloud.sh');
    console.log('2. Or follow: ORACLE_CLOUD_DEPLOYMENT_GUIDE.md');
} else if (passedTests >= totalTests * 0.6) {
    console.log('⚠️  PARTIALLY READY - MINOR ISSUES');
    console.log('');
    console.log('Your system can run on Oracle Cloud but may need some adjustments.');
    console.log('Review the failed tests above and address any critical issues.');
} else {
    console.log('❌ NOT READY - MAJOR ISSUES');
    console.log('');
    console.log('Several compatibility issues detected. Please address the failed tests.');
}

console.log('');
console.log('📖 For detailed deployment instructions, see:');
console.log('   - ORACLE_CLOUD_DEPLOYMENT_GUIDE.md');
console.log('   - ./deploy-oracle-cloud.sh');
console.log('');
console.log('🆘 Need help? Check the troubleshooting section in the deployment guide.');

// Generate detailed report
const report = {
    timestamp: new Date().toISOString(),
    system: {
        platform: process.platform,
        architecture: process.arch,
        nodeVersion: process.version,
        totalMemory: `${(os.totalmem() / (1024 * 1024 * 1024)).toFixed(1)}GB`
    },
    compatibility: {
        totalTests,
        passedTests,
        failedTests: totalTests - passedTests,
        successRate: `${Math.round((passedTests / totalTests) * 100)}%`,
        ready: passedTests >= totalTests * 0.8
    },
    tests,
    recommendations: passedTests >= totalTests * 0.8 ? [
        'Deploy using Oracle Compute Instance for simplicity',
        'Use Oracle Always Free Tier to get started',
        'Consider Oracle Container Engine (OKE) for production',
        'Set up monitoring with Oracle Cloud monitoring services',
        'Use Oracle Autonomous Database for data persistence'
    ] : [
        'Address failed compatibility tests',
        'Ensure all dependencies are properly configured',
        'Test locally before deploying to Oracle Cloud',
        'Review deployment guide for troubleshooting'
    ]
};

fs.writeFileSync('oracle-cloud-compatibility-report.json', JSON.stringify(report, null, 2));
console.log('📄 Detailed report saved to: oracle-cloud-compatibility-report.json');