terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "Terraform"
      Workload    = "Brain-Tumor-MRI-XAI"
    }
  }
}

# ==============================================================================
# 1. NETWORKING INFRASTRUCTURE (VPC, Subnet, Route Table)
# ==============================================================================

resource "aws_vpc" "cerebra_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${var.project_name}-vpc"
  }
}

resource "aws_internet_gateway" "cerebra_igw" {
  vpc_id = aws_vpc.cerebra_vpc.id

  tags = {
    Name = "${var.project_name}-igw"
  }
}

resource "aws_subnet" "cerebra_public_subnet" {
  vpc_id                  = aws_vpc.cerebra_vpc.id
  cidr_block              = "10.0.1.0/24"
  map_public_ip_on_launch = true
  availability_zone       = "${var.aws_region}a"

  tags = {
    Name = "${var.project_name}-public-subnet"
  }
}

resource "aws_route_table" "cerebra_public_rt" {
  vpc_id = aws_vpc.cerebra_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.cerebra_igw.id
  }

  tags = {
    Name = "${var.project_name}-public-rt"
  }
}

resource "aws_route_table_association" "cerebra_public_assoc" {
  subnet_id      = aws_subnet.cerebra_public_subnet.id
  route_table_id = aws_route_table.cerebra_public_rt.id
}

# ==============================================================================
# 2. SECURITY GROUP (Firewall Rules for Web, API, and SSH)
# ==============================================================================

resource "aws_security_group" "cerebra_sg" {
  name        = "${var.project_name}-sg"
  description = "Security Group for Cerebra ML Inference & XAI Web Platform"
  vpc_id      = aws_vpc.cerebra_vpc.id

  # HTTP Web Traffic
  ingress {
    description = "HTTP Web Access"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTPS Web Traffic
  ingress {
    description = "HTTPS Secure Web Access"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # FastAPI Backend API Port
  ingress {
    description = "FastAPI Backend API Direct Access"
    from_port   = 8000
    to_port     = 8000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Vite Frontend Dev/Preview Port
  ingress {
    description = "Vite Frontend Port"
    from_port   = 5173
    to_port     = 5173
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # SSH Access
  ingress {
    description = "Administrative SSH Access"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.allowed_ssh_cidr]
  }

  # Outbound Internet Access
  egress {
    description = "Permit all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-sg"
  }
}

# ==============================================================================
# 3. LATEST UBUNTU 22.04 LTS AMI DISCOVERY
# ==============================================================================

data "aws_ami" "ubuntu_lts" {
  most_recent = true
  owners      = ["099720109477"] # Canonical official owner ID

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# ==============================================================================
# 4. EC2 VIRTUAL MACHINE FOR ML & XAI WORKLOAD
# ==============================================================================

resource "aws_instance" "cerebra_server" {
  ami                         = data.aws_ami.ubuntu_lts.id
  instance_type               = var.instance_type
  subnet_id                   = aws_subnet.cerebra_public_subnet.id
  vpc_security_group_ids      = [aws_security_group.cerebra_sg.id]
  associate_public_ip_address = true
  key_name                    = var.key_name != "" ? var.key_name : null

  # High-throughput EBS volume for ML model checkpoints and fast disk I/O
  root_block_device {
    volume_size           = var.volume_size_gb
    volume_type           = "gp3"
    iops                  = 3000
    throughput            = 125
    delete_on_termination = true
    encrypted             = true

    tags = {
      Name = "${var.project_name}-root-ebs"
    }
  }

  user_data = file("${path.module}/user_data.sh")

  tags = {
    Name        = "${var.project_name}-server"
    Backbone    = "EfficientNet-B0"
    XAISuite    = "Grad-CAM-LIME-SHAP"
    Environment = var.environment
  }
}

# Elastic IP for Static Public DNS / IP
resource "aws_eip" "cerebra_eip" {
  instance = aws_instance.cerebra_server.id
  domain   = "vpc"

  tags = {
    Name = "${var.project_name}-eip"
  }
}

# ==============================================================================
# 5. CLOUDWATCH METRIC ALARM (CPU Stress Monitoring)
# ==============================================================================

resource "aws_cloudwatch_metric_alarm" "high_cpu_alarm" {
  alarm_name          = "${var.project_name}-high-cpu-alarm"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = 85
  alarm_description   = "Monitors if LIME/SHAP computations cause sustained CPU stress > 85%"

  dimensions = {
    InstanceId = aws_instance.cerebra_server.id
  }
}
