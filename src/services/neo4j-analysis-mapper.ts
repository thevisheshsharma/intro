import { updateOrganizationProperties } from '@/services';
import { runQuery } from '@/lib/neo4j';

interface AnalysisData {
  [key: string]: any;
}

interface ClassificationData {
  org_type?: string;
  org_subtype?: string[];
  web3_focus?: string;
}

export class Neo4jAnalysisMapper {
  private static readonly ARRAY_FIELDS = [
    'github', 'competitors', 'key_features', 'audience', 'geography', 'narratives', 
    'partners', 'recent_updates', 'investors', 'utilities', 'chains', 'tech_stack', 
    'dev_tools', 'engagement_patterns', 'retention_factors', 'age_groups', 'experience', 
    'roles', 'motivations', 'decision_factors', 'interaction_preferences', 'activity_patterns', 
    'conversion_factors', 'loyalty_indicators', 'yield', 'platforms', 'gameplay', 'game_token', 
    'nft_assets', 'assets', 'fiat', 'sectors', 'investments', 'model', 'category', 'clients', 
    'initiatives', 'benefits', 'user_archetypes', 'messaging_strategy', 'auditor',
    'utility_features', 'marketplace_integrations', 'asset_types', 'community_features'
  ];
  
  private static readonly EXCLUDED_FIELDS = [
    'twitter_username', 'timestamp_utc', 'classification_used'
  ];

  /**
   * Transform analysis data to Neo4j-compatible format
   */
  static transformAnalysisForNeo4j(
    analysis: AnalysisData, 
    classification?: ClassificationData
  ): Record<string, any> {
    const properties: Record<string, any> = {};
    
    Object.entries(analysis).forEach(([key, value]) => {
      if (this.EXCLUDED_FIELDS.includes(key) || value == null || value === '') {
        return;
      }
      
      // Handle arrays and objects - JSON stringify them
      if (this.ARRAY_FIELDS.includes(key) || Array.isArray(value) || (typeof value === 'object' && value !== null)) {
        properties[key] = JSON.stringify(value);
      } else {
        properties[key] = value;
      }
    });
    
    // Add metadata
    properties.last_icp_analysis = new Date().toISOString();
    
    // ✅ FIXED: Store classification data in individual fields instead of JSON
    if (classification) {
      if (classification.org_type) {
        properties.org_type = classification.org_type;
      }
      if (classification.org_subtype) {
        properties.org_subtype = JSON.stringify(classification.org_subtype);
      }
      if (classification.web3_focus) {
        properties.web3_focus = classification.web3_focus;
      }
    }
    
    return properties;
  }

  /**
   * Store analysis data to Neo4j with error handling
   */
  static async storeAnalysisToNeo4j(
    userId: string,
    analysis: AnalysisData,
    classification?: ClassificationData
  ): Promise<void> {
    try {
      const properties = this.transformAnalysisForNeo4j(analysis, classification);
      
      console.log(`📊 Preparing to store ${Object.keys(properties).length} properties to Neo4j`);
      console.log(`   📋 Key fields: ${Object.keys(properties).slice(0, 10).join(', ')}...`);
      
      if (Object.keys(properties).length > 0) {
        await updateOrganizationProperties(userId, properties);
        console.log(`✅ Successfully stored complete flattened ICP analysis to Neo4j`);
        console.log(`   📊 Total properties stored: ${Object.keys(properties).length}`);
      } else {
        console.log(`⚠️  No properties extracted from analysis to store`);
      }
    } catch (error) {
      console.error(`❌ Failed to store complete analysis to Neo4j:`, error);
      throw error;
    }
  }

  /**
   * Get statistics about what fields are being stored
   */
  static getStorageStats(analysis: AnalysisData): {
    totalFields: number;
    arrayFields: number;
    excludedFields: number;
    storableFields: number;
  } {
    const allFields = Object.keys(analysis);
    const arrayFields = allFields.filter(key => 
      this.ARRAY_FIELDS.includes(key) || 
      Array.isArray(analysis[key]) || 
      (typeof analysis[key] === 'object' && analysis[key] !== null)
    );
    const excludedFields = allFields.filter(key => this.EXCLUDED_FIELDS.includes(key));
    const storableFields = allFields.filter(key => 
      !this.EXCLUDED_FIELDS.includes(key) && 
      analysis[key] != null && 
      analysis[key] !== ''
    );

    return {
      totalFields: allFields.length,
      arrayFields: arrayFields.length,
      excludedFields: excludedFields.length,
      storableFields: storableFields.length
    };
  }

  /**
   * One-time cleanup function to remove redundant classification_used field
   */
  static async removeRedundantClassificationField(): Promise<{ cleaned: number }> {
    try {
      const query = `
        MATCH (u:User)
        WHERE u.classification_used IS NOT NULL
        REMOVE u.classification_used
        RETURN count(u) as cleaned
      `;
      
      const result = await runQuery(query, {});
      const cleaned = result[0]?.cleaned || 0;
      
      console.log(`✅ Cleaned ${cleaned} records by removing redundant classification_used field`);
      return { cleaned };
    } catch (error) {
      console.error('❌ Failed to clean redundant classification_used field:', error);
      throw error;
    }
  }
}
