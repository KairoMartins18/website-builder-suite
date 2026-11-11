<?php
/**
 * Plugin Name:       Website Builder Suite
 * Plugin URI:        https://github.com/website-builder-suite
 * Description:       Complemento dos temas criados no Website Builder Suite: formulários de contato que funcionam (e-mail + mensagens no painel), seções em modo livre e blocos com prévia no editor.
 * Version:           0.1.0
 * Requires at least: 6.5
 * Requires PHP:      7.4
 * Author:            Website Builder Suite
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       website-builder-suite
 *
 * @package WebsiteBuilderSuite
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'WBS_PLUGIN_VERSION', '0.1.0' );
define( 'WBS_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'WBS_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

require_once WBS_PLUGIN_DIR . 'includes/helpers.php';
require_once WBS_PLUGIN_DIR . 'includes/forms.php';
require_once WBS_PLUGIN_DIR . 'includes/messages.php';

/**
 * Registra os blocos a partir dos arquivos block.json.
 */
function wbs_register_blocks() {
	$asset = include WBS_PLUGIN_DIR . 'assets/editor.asset.php';
	wp_register_script( 'wbs-editor', WBS_PLUGIN_URL . 'assets/editor.js', $asset['dependencies'], $asset['version'], true );
	wp_set_script_translations( 'wbs-editor', 'website-builder-suite' );
	wp_register_style( 'wbs-blocks', WBS_PLUGIN_URL . 'assets/blocks.css', array(), WBS_PLUGIN_VERSION );
	register_block_type( WBS_PLUGIN_DIR . 'blocks/free-section' );
	register_block_type( WBS_PLUGIN_DIR . 'blocks/form' );
}
add_action( 'init', 'wbs_register_blocks' );

/**
 * Categoria própria no inseridor de blocos.
 *
 * @param array $categories Categorias existentes.
 * @return array
 */
function wbs_block_categories( $categories ) {
	array_unshift(
		$categories,
		array(
			'slug'  => 'website-builder-suite',
			'title' => __( 'Website Builder Suite', 'website-builder-suite' ),
		)
	);
	return $categories;
}
add_filter( 'block_categories_all', 'wbs_block_categories' );
