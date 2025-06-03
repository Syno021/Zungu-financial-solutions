//healixir-qrcode.util.ts

export interface CustomQROptions {
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
  dotStyle?: 'square' | 'rounded' | 'dots';
  size?: number;
  margin?: number;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
}

export class HealixirQRCode {
  private static defaultOptions: CustomQROptions = {
    primaryColor: '#2E7D32', // Emerald Green (primary)
    secondaryColor: '#A5D6A7', // Mint color
    dotStyle: 'rounded',
    size: 200,
    margin: 4,
    errorCorrectionLevel: 'H' // High error correction for better readability
  };

  // QR code specification constants
  private static readonly PAD0 = 0xEC;
  private static readonly PAD1 = 0x11;

  /**
   * Generate a custom QR code with Healixir styling from scratch
   * @param data String data to encode in QR code
   * @param options Customization options
   * @returns Promise with data URL of the generated QR code
   */
  static async generate(data: string, options?: Partial<CustomQROptions>): Promise<string> {
    try {
      // Merge default options with provided options
      const mergedOptions = { ...this.defaultOptions, ...options };
      
      // Create canvas for rendering
      const canvas = document.createElement('canvas');
      const size = mergedOptions.size || 200;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Canvas context not available');
      }
      
      // Generate QR code matrix from scratch
      const qrMatrix = await this.generateQRMatrix(data, mergedOptions.errorCorrectionLevel || 'H');
      
      // Draw gradient background
      const gradient = ctx.createLinearGradient(0, 0, size, size);
      gradient.addColorStop(0, '#F5FAF6'); // Background color
      gradient.addColorStop(1, '#E8F5E9'); // Lighter mint tint
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);
      
      // Apply rounded corners to the background
      this.roundRect(ctx, 0, 0, size, size, 15);
      
      // Draw the QR code using the generated matrix
      this.drawQRCodeFromMatrix(ctx, qrMatrix, mergedOptions);
      
      // Add logo if provided
      if (mergedOptions.logoUrl) {
        await this.addLogo(ctx, mergedOptions.logoUrl, size);
      }
      
      // Add decorative elements (Healixir leaf symbol)
      this.addDecorativeElements(ctx, size, mergedOptions);
      
      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('Error generating custom QR code:', error);
      throw error;
    }
  }

  /**
   * Generate a QR code matrix from scratch based on input data
   * @param data Data to encode in the QR code
   * @param errorLevel Error correction level
   * @returns 2D array representing the QR code matrix
   */
  private static async generateQRMatrix(
    data: string,
    errorLevel: 'L' | 'M' | 'Q' | 'H'
  ): Promise<boolean[][]> {
    // For simplicity, we'll implement a version 3 QR code (29x29)
    // In a full implementation, this would determine the optimal version based on data length
    const version = 3;
    const size = 17 + version * 4; // Version 3 is 29x29 modules
    
    // Initialize empty matrix
    const matrix: boolean[][] = Array(size).fill(null).map(() => Array(size).fill(false));
    
    // Add finder patterns (the three large squares in corners)
    this.addFinderPatterns(matrix);
    
    // Add timing patterns (alternating modules running between finder patterns)
    this.addTimingPatterns(matrix);
    
    // Add alignment patterns (only present in version 2+)
    if (version >= 2) {
      // Version 3 has one alignment pattern at position (22, 22)
      this.addAlignmentPattern(matrix, 22, 22);
    }
    
    // Add format information
    this.addFormatInfo(matrix, errorLevel);
    
    // Encode data
    const encodedData = this.encodeData(data, version, errorLevel);
    
    // Place data bits in the matrix using the mask pattern
    this.placeDataBits(matrix, encodedData);
    
    return matrix;
  }

  /**
   * Add finder patterns to the QR matrix (the three large squares in corners)
   */
  private static addFinderPatterns(matrix: boolean[][]): void {
    // Positions for the three finder patterns
    const positions = [
      [0, 0], // Top-left
      [0, matrix.length - 7], // Bottom-left
      [matrix.length - 7, 0] // Top-right
    ];
    
    for (const [row, col] of positions) {
      // Draw 7x7 finder pattern
      // Outer border (all black)
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
            matrix[row + r][col + c] = true; // Black module
          }
        }
      }
    }
    
    // Add white separator around finder patterns
    for (const [row, col] of positions) {
      // Add horizontal separators
      for (let c = 0; c < 8; c++) {
        if (row + 7 < matrix.length) matrix[row + 7][col + c] = false;
        if (col + 7 < matrix.length && row + c < matrix.length) matrix[row + c][col + 7] = false;
      }
    }
  }

  /**
   * Add timing patterns to the QR matrix
   */
  private static addTimingPatterns(matrix: boolean[][]): void {
    // Horizontal timing pattern
    for (let i = 8; i < matrix.length - 8; i++) {
      matrix[6][i] = (i % 2 === 0); // Alternating black and white
    }
    
    // Vertical timing pattern
    for (let i = 8; i < matrix.length - 8; i++) {
      matrix[i][6] = (i % 2 === 0); // Alternating black and white
    }
  }

  /**
   * Add alignment pattern at specified position
   */
  private static addAlignmentPattern(matrix: boolean[][], centerRow: number, centerCol: number): void {
    for (let r = -2; r <= 2; r++) {
      for (let c = -2; c <= 2; c++) {
        const isOuterBorder = (r === -2 || r === 2 || c === -2 || c === 2);
        const isCenter = (r === 0 && c === 0);
        
        matrix[centerRow + r][centerCol + c] = isOuterBorder || isCenter;
      }
    }
  }

  /**
   * Add format information to the QR matrix
   */
  private static addFormatInfo(matrix: boolean[][], errorLevel: 'L' | 'M' | 'Q' | 'H'): void {
    // Format info bits based on error correction level and mask pattern
    // For simplicity, we'll use mask pattern 0
    let formatBits = 0;
    
    // Set error correction level bits
    switch (errorLevel) {
      case 'L': formatBits = 0b01; break;
      case 'M': formatBits = 0b00; break;
      case 'Q': formatBits = 0b11; break;
      case 'H': formatBits = 0b10; break;
    }
    
    // Shift left by 3 bits and add mask pattern (using 0 for simplicity)
    formatBits = (formatBits << 3) | 0;
    
    // Apply BCH error correction to format bits
    formatBits = this.calculateBCHFormatCode(formatBits);
    
    // Place format bits in the matrix
    // Two copies are stored: around top-left finder pattern and split between other finder patterns
    // This is highly simplified - a real implementation would follow QR code specifications
    
    // Set format bits to fixed positions in the matrix
    // This is a simplified approach
    let bitIndex = 0;
    
    // Around top-left finder pattern
    for (let i = 0; i <= 5; i++) {
      matrix[8][i] = ((formatBits >> bitIndex) & 1) === 1;
      bitIndex++;
    }
    
    for (let i = 7; i >= 0 && bitIndex < 15; i--) {
      if (i !== 6) { // Skip timing pattern
        matrix[i][8] = ((formatBits >> bitIndex) & 1) === 1;
        bitIndex++;
      }
    }
    
    // Reset for second copy
    bitIndex = 0;
    
    // Split between other finder patterns
    for (let i = matrix.length - 1; i >= matrix.length - 8; i--) {
      matrix[8][i] = ((formatBits >> bitIndex) & 1) === 1;
      bitIndex++;
    }
    
    for (let i = matrix.length - 7; i <= matrix.length - 1 && bitIndex < 15; i++) {
      matrix[i][8] = ((formatBits >> bitIndex) & 1) === 1;
      bitIndex++;
    }
  }

  /**
   * Calculate BCH error correction code for format information
   */
  private static calculateBCHFormatCode(formatBits: number): number {
    const G = 0b10100110111; // Generator polynomial for format bits
    
    // Shift format bits left by 10 (size of error correction code)
    let bch = formatBits << 10;
    
    // Find highest bit position in bch
    let bitLength = 0;
    for (let temp = bch; temp > 0; temp >>= 1) {
      bitLength++;
    }
    
    // XOR with generator whenever highest bit is 1
    for (let i = bitLength - 10; i > 0; i--) {
      if ((bch & (1 << (i + 9))) !== 0) {
        bch ^= G << (i - 1);
      }
    }
    
    // Combine format bits with error correction bits
    return (formatBits << 10) | bch;
  }

  /**
   * Encode data for QR code
   */
  private static encodeData(
    data: string,
    version: number,
    errorLevel: 'L' | 'M' | 'Q' | 'H'
  ): boolean[] {
    // This is a simplified approach - a full implementation would follow QR code encoding rules
    // For a real implementation, you would:
    // 1. Determine mode (numeric, alphanumeric, byte)
    // 2. Add mode indicator
    // 3. Add character count indicator
    // 4. Encode data
    // 5. Add terminator and padding
    // 6. Apply error correction
    
    // For this simplified version, we'll just encode ASCII chars as byte mode
    let bitString = '';
    
    // Mode indicator for byte mode (0100)
    bitString += '0100';
    
    // Character count indicator (8 bits for version 1-9 in byte mode)
    const charCount = data.length;
    bitString += charCount.toString(2).padStart(8, '0');
    
    // Encode data in byte mode
    for (let i = 0; i < data.length; i++) {
      const charCode = data.charCodeAt(i);
      bitString += charCode.toString(2).padStart(8, '0');
    }
    
    // Add terminator (0000)
    bitString += '0000';
    
    // Pad with 0s to make length multiple of 8
    while (bitString.length % 8 !== 0) {
      bitString += '0';
    }
    
    // Add padding bytes to reach required capacity
    // For version 3-H, capacity is 27 bytes (simplified)
    const requiredBits = 27 * 8;
    
    // Add alternating padding bytes
    let padIndex = 0;
    const padBytes = [this.PAD0, this.PAD1];
    
    while (bitString.length < requiredBits) {
      const padByte = padBytes[padIndex].toString(2).padStart(8, '0');
      bitString += padByte;
      padIndex = (padIndex + 1) % 2;
    }
    
    // Convert bit string to boolean array
    const bits: boolean[] = [];
    for (let i = 0; i < bitString.length; i++) {
      bits.push(bitString[i] === '1');
    }
    
    return bits;
  }

  /**
   * Place data bits in the QR matrix using mask pattern
   */
  private static placeDataBits(matrix: boolean[][], bits: boolean[]): void {
    let bitIndex = 0;
    
    // Start from bottom right
    let direction = -1; // -1 for up, 1 for down
    let col = matrix.length - 1;
    
    // Skip over the rightmost two columns
    col -= 1;
    
    // Traverse the matrix in zigzag from bottom right to top left
    while (col >= 0 && bitIndex < bits.length) {
      // Skip column 6 (timing pattern)
      if (col === 6) {
        col--;
        continue;
      }
      
      // For each column pair
      for (let row = (direction === -1) ? matrix.length - 1 : 0;
           row >= 0 && row < matrix.length;
           row += direction) {
        
        // Process two columns
        for (let c = 0; c < 2; c++) {
          const currentCol = col - c;
          
          // Skip if this module is already set (part of function patterns)
          if (this.isFunction(matrix, row, currentCol)) {
            continue;
          }
          
          // Place the bit
          if (bitIndex < bits.length) {
            const dataBit = bits[bitIndex++];
            
            // Apply mask pattern 0 (mask if (row + column) mod 2 === 0)
            if ((row + currentCol) % 2 === 0) {
              matrix[row][currentCol] = !dataBit;
            } else {
              matrix[row][currentCol] = dataBit;
            }
          }
        }
      }
      
      // Move to next column pair
      col -= 2;
      direction *= -1; // Reverse direction
    }
  }

  /**
   * Check if a module is part of function patterns
   */
  private static isFunction(matrix: boolean[][], row: number, col: number): boolean {
    const size = matrix.length;
    
    // Check if in finder pattern regions (top-left, top-right, bottom-left)
    if ((row < 9 && col < 9) || // Top-left finder and separator
        (row < 9 && col >= size - 8) || // Top-right finder and separator
        (row >= size - 8 && col < 9)) { // Bottom-left finder and separator
      return true;
    }
    
    // Check if part of timing patterns
    if (row === 6 || col === 6) {
      return true;
    }
    
    // Check if part of alignment pattern (for Version 3, center at (22, 22))
    if (row >= 20 && row <= 24 && col >= 20 && col <= 24) {
      return true;
    }
    
    // Check if part of format information
    if ((row === 8 && col < 9) || (col === 8 && (row < 9 || row >= size - 8))) {
      return true;
    }
    
    return false;
  }

  /**
   * Draw QR code from the generated matrix
   */
  private static drawQRCodeFromMatrix(
    ctx: CanvasRenderingContext2D,
    matrix: boolean[][],
    options: CustomQROptions
  ): void {
    const size = options.size || 200;
    const margin = options.margin || 4;
    const matrixSize = matrix.length;
    
    // Calculate module size
    const moduleSize = (size - 2 * margin) / matrixSize;
    
    // Draw the modules
    for (let row = 0; row < matrixSize; row++) {
      for (let col = 0; col < matrixSize; col++) {
        if (matrix[row][col]) {
          // Determine if this is a finder pattern (corners)
          const isFinderPattern = 
            (row < 7 && col < 7) || // Top-left
            (row < 7 && col >= matrixSize - 7) || // Top-right
            (row >= matrixSize - 7 && col < 7); // Bottom-left
          
          // Choose color based on position
          ctx.fillStyle = isFinderPattern ? options.primaryColor! : options.secondaryColor!;
          
          const x = margin + col * moduleSize;
          const y = margin + row * moduleSize;
          const dotSize = moduleSize * 0.9; // Slightly smaller dots for style
          
          // Draw module based on dot style
          if (options.dotStyle === 'rounded') {
            this.roundRect(ctx, x, y, dotSize, dotSize, dotSize / 3);
          } else if (options.dotStyle === 'dots') {
            ctx.beginPath();
            ctx.arc(x + dotSize / 2, y + dotSize / 2, dotSize / 2, 0, Math.PI * 2);
            ctx.fill();
          } else {
            // Square style (default)
            ctx.fillRect(x, y, dotSize, dotSize);
          }
        }
      }
    }
    
    // Draw enhanced finder patterns
    this.drawEnhancedFinderPatterns(ctx, size, margin, matrixSize, moduleSize, options);
  }

  /**
   * Draw enhanced finder patterns for style
   */
  private static drawEnhancedFinderPatterns(
    ctx: CanvasRenderingContext2D,
    size: number,
    margin: number,
    matrixSize: number,
    moduleSize: number,
    options: CustomQROptions
  ): void {
    const finderPositions = [
      { x: margin, y: margin }, // Top-left
      { x: margin, y: size - 7 * moduleSize - margin }, // Bottom-left
      { x: size - 7 * moduleSize - margin, y: margin } // Top-right
    ];
    
    finderPositions.forEach(pos => {
      const patternSize = 7 * moduleSize;
      
      // Clear the existing pattern
      ctx.clearRect(pos.x, pos.y, patternSize, patternSize);
      
      // Outer square
      ctx.fillStyle = options.primaryColor!;
      this.roundRect(ctx, pos.x, pos.y, patternSize, patternSize, patternSize / 5);
      
      // Inner square (white)
      ctx.fillStyle = '#FFFFFF';
      const innerSize = patternSize * 0.7;
      const innerPos = (patternSize - innerSize) / 2;
      this.roundRect(
        ctx,
        pos.x + innerPos,
        pos.y + innerPos,
        innerSize,
        innerSize,
        innerSize / 5
      );
      
      // Center square
      ctx.fillStyle = options.primaryColor!;
      const centerSize = patternSize * 0.4;
      const centerPos = (patternSize - centerSize) / 2;
      this.roundRect(
        ctx,
        pos.x + centerPos,
        pos.y + centerPos,
        centerSize,
        centerSize,
        centerSize / 5
      );
    });
  }

  /**
   * Add a logo to the center of the QR code
   */
  private static async addLogo(
    ctx: CanvasRenderingContext2D,
    logoUrl: string,
    size: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const logo = new Image();
      logo.onload = () => {
        try {
          const logoSize = size / 4; // Logo size (25% of QR code)
          const logoX = (size - logoSize) / 2;
          const logoY = (size - logoSize) / 2;
          
          // Draw white background for logo
          ctx.fillStyle = 'white';
          this.roundRect(ctx, logoX - 5, logoY - 5, logoSize + 10, logoSize + 10, 10);
          
          // Draw logo
          ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
          resolve();
        } catch (error) {
          reject(error);
        }
      };
      logo.onerror = reject;
      logo.src = logoUrl;
    });
  }

  /**
   * Add decorative elements to enhance the QR code
   */
  private static addDecorativeElements(
    ctx: CanvasRenderingContext2D,
    size: number,
    options: CustomQROptions
  ): void {
    // Add subtle leaf or medical symbol in the background
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = options.primaryColor!;
    
    // Simplified leaf pattern in the background
    const centerX = size / 2;
    const centerY = size / 2;
    
    // Draw a subtle leaf
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - size * 0.3);
    ctx.bezierCurveTo(
      centerX + size * 0.2, centerY - size * 0.1,
      centerX + size * 0.1, centerY + size * 0.2,
      centerX, centerY + size * 0.3
    );
    ctx.bezierCurveTo(
      centerX - size * 0.1, centerY + size * 0.2,
      centerX - size * 0.2, centerY - size * 0.1,
      centerX, centerY - size * 0.3
    );
    ctx.fill();
    
    // Reset alpha
    ctx.globalAlpha = 1.0;
    
    // Add a subtle border
    ctx.strokeStyle = options.primaryColor!;
    ctx.lineWidth = 2;
    this.roundRect(ctx, 1, 1, size - 2, size - 2, 15, false, true);
  }

  /**
   * Helper function to draw rounded rectangles
   */
  private static roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    fill: boolean = true,
    stroke: boolean = false
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    
    if (fill) {
      ctx.fill();
    }
    if (stroke) {
      ctx.stroke();
    }
  }
}