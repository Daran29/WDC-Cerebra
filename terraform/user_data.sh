#!/bin/bash
set -euxo pipefail

# ==============================================================================
# Cerebra Platform AWS EC2 Bootstrap & ML Runtime Provisioning Script
# ==============================================================================

# 1. Update OS and install base dependencies
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
apt-get install -y --no-install-recommends \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    htop \
    ufw

# 2. Critical ML Safety Precaution: Allocate 4GB Swap Space
# Prevents Linux OOM-killer from terminating the Python process during heavy SHAP matrix permutations
if [ ! -f /swapfile ]; then
    echo "Configuring 4GB emergency swap space..."
    fallocate -l 4G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    sysctl vm.swappiness=10
    echo 'vm.swappiness=10' >> /etc/sysctl.conf
fi

# 3. Install Docker Engine
mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Enable and start Docker
systemctl enable docker
systemctl start docker
usermod -aG docker ubuntu || true

# 4. Configure optimized sysctl parameters for high concurrency ASGI workloads
cat <<EOF >> /etc/sysctl.conf
net.core.somaxconn = 4096
net.ipv4.tcp_max_syn_backlog = 4096
fs.file-max = 2097152
EOF
sysctl -p

echo "=== Cerebra EC2 Environment Successfully Initialized ==="
