variable "aws_region" {
  description = "AWS deployment region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment (e.g. production, staging, hackathon)"
  type        = string
  default     = "production"
}

variable "project_name" {
  description = "Project name identifier for tags and resource names"
  type        = string
  default     = "cerebra-brain-tumor-xai"
}

variable "instance_type" {
  description = "EC2 Instance type. Recommended: 'c6i.xlarge' (4 vCPU, 8GB RAM, AVX-512) for CPU XAI or 'g4dn.xlarge' (4 vCPU, 16GB RAM, 1x NVIDIA T4) for GPU acceleration."
  type        = string
  default     = "c6i.xlarge"
}

variable "volume_size_gb" {
  description = "Root EBS storage volume size in GB (gp3)"
  type        = number
  default     = 40
}

variable "allowed_ssh_cidr" {
  description = "CIDR block permitted for SSH administrative access (port 22)"
  type        = string
  default     = "0.0.0.0/0"
}

variable "key_name" {
  description = "Optional existing AWS EC2 Key Pair name for SSH access"
  type        = string
  default     = ""
}
